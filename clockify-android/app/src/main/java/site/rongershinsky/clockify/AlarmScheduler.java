package site.rongershinsky.clockify;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.util.Log;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * Exact alarms via AlarmManager.setAlarmClock.
 * While the page is open, fire times come from alarm-core.js nextOccurrence (the sync payload).
 * After boot, or after a ring while the page is closed, the same result is recomputed with AlarmMath,
 * which is checked against alarm-core.js.
 */
public final class AlarmScheduler {
    static final String TAG = "ClockifyAlarm";
    private static final String AUTO_ID = "auto";

    private static AlarmScheduler instance;

    private final Context app;
    private final AlarmStore store;

    private AlarmScheduler(Context app) {
        this.app = app.getApplicationContext();
        this.store = AlarmStore.open(this.app);
    }

    public static synchronized AlarmScheduler get(Context ctx) {
        if (instance == null) instance = new AlarmScheduler(ctx.getApplicationContext());
        return instance;
    }

    public static boolean canExact(Context ctx) {
        if (Build.VERSION.SDK_INT < 31) return true;
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        return am != null && am.canScheduleExactAlarms();
    }

    public synchronized void syncFromJs(String json) {
        try {
            JSONObject payload = new JSONObject(json);
            store.applyPayload(payload);
            List<Item> items = new ArrayList<>();
            JSONArray schedule = payload.optJSONArray("schedule");
            if (schedule != null) {
                for (int i = 0; i < schedule.length(); i++) {
                    JSONObject o = schedule.optJSONObject(i);
                    if (o != null) items.add(fromJs(o));
                }
            } else {
                items = buildFromStore(System.currentTimeMillis());
            }
            replace(items);
        } catch (Exception e) {
            Log.e(TAG, "sync", e);
        }
    }

    /** BOOT_COMPLETED and clock changes. Uses the stored rg-sbx-clockify-* sandbox data. */
    public synchronized void restore() {
        try {
            if (!store.hasState()) return;
            replace(buildFromStore(System.currentTimeMillis()));
            Log.i(TAG, "restored native alarms");
        } catch (Exception e) {
            Log.e(TAG, "restore", e);
            try {
                replace(fallbackSchedule(System.currentTimeMillis()));
            } catch (Exception e2) {
                Log.e(TAG, "fallback", e2);
            }
        }
    }

    public synchronized void onFired(Intent intent) {
        String alarmId = intent.getStringExtra("alarmId");
        boolean snooze = intent.getBooleanExtra("snooze", false);
        if (snooze) store.removeSnooze(alarmId, intent.getLongExtra("snoozeAt", 0));
        else store.markFired(alarmId, intent.getStringExtra("occurrenceKey"));
        try {
            replace(buildFromStore(System.currentTimeMillis()));
        } catch (Exception e) {
            Log.e(TAG, "reschedule after fire", e);
        }
        Intent ring = new Intent(app, RingService.class);
        ring.setAction(RingService.ACTION_RING);
        ring.putExtras(intent);
        try {
            androidx.core.content.ContextCompat.startForegroundService(app, ring);
        } catch (RuntimeException e) {
            Log.e(TAG, "foreground service", e);
            RingService.postFallback(app, intent);
        }
        try {
            Intent activity = new Intent(app, RingActivity.class);
            activity.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            activity.putExtras(intent);
            app.startActivity(activity);
        } catch (RuntimeException e) {
            Log.w(TAG, "full screen activity deferred to the notification", e);
        }
        pushToPage();
    }

    public synchronized void onAuto(String token) {
        JSONObject active = store.activeRing();
        if (token == null || !token.equals(active.optString("token"))) return;
        store.addSnooze(active.optString("alarmId"), active.optString("title"), active.optString("type"));
        store.clearRing();
        disarmAuto();
        try {
            replace(buildFromStore(System.currentTimeMillis()));
        } catch (Exception e) {
            Log.e(TAG, "auto snooze", e);
        }
        app.stopService(new Intent(app, RingService.class));
        pushToPage();
    }

    public synchronized void snoozeCurrent(String alarmId, String title, String type) {
        store.addSnooze(alarmId, title, type);
        try {
            replace(buildFromStore(System.currentTimeMillis()));
        } catch (Exception e) {
            Log.e(TAG, "snooze", e);
        }
        pushToPage();
    }

    public synchronized void rememberRing(String token, String alarmId, String title, String type) {
        store.rememberRing(token, alarmId, title, type);
        armAuto(token);
    }

    public synchronized void clearRing() {
        store.clearRing();
        disarmAuto();
    }

    public void pushToPage() {
        String json = store.storedState();
        if (json == null || json.isEmpty()) return;
        MainActivity.pushState(json);
    }

    private void armAuto(String token) {
        long when = System.currentTimeMillis() + AlarmMath.RING_MAX_MS;
        AlarmManager am = manager();
        if (am == null) return;
        Intent intent = new Intent(app, AlarmReceiver.class);
        intent.setAction(AlarmReceiver.ACTION_AUTO);
        intent.setData(Uri.parse("clockify://alarm/auto"));
        intent.putExtra("token", token);
        PendingIntent op = PendingIntent.getBroadcast(app, store.codeFor(AUTO_ID), intent, flags());
        PendingIntent show = showIntent();
        try {
            if (canExact(app)) am.setAlarmClock(new AlarmManager.AlarmClockInfo(when, show), op);
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, op);
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, when, op);
        }
    }

    private void disarmAuto() {
        AlarmManager am = manager();
        if (am == null) return;
        Intent intent = new Intent(app, AlarmReceiver.class);
        intent.setAction(AlarmReceiver.ACTION_AUTO);
        intent.setData(Uri.parse("clockify://alarm/auto"));
        PendingIntent op = PendingIntent.getBroadcast(app, store.codeFor(AUTO_ID), intent, flags());
        am.cancel(op);
    }

    private List<Item> buildFromStore(long now) throws JSONException {
        AlarmMath math = AlarmMath.device();
        String lang = store.lang();
        String def = store.defSound();
        List<AlarmMath.Cat> cats = store.cats();
        List<Item> items = new ArrayList<>();
        JSONArray alarms = store.alarms();
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject o = alarms.optJSONObject(i);
            if (o == null) continue;
            AlarmMath.Alarm alarm = AlarmStore.toAlarm(o);
            AlarmMath.When due = math.due(alarm, now);
            if (due != null) {
                Item item = baseItem(o, alarm, lang, cats, def, math);
                item.id = "due:" + alarm.id + ":" + due.key;
                item.at = now + AlarmMath.DUE_SOON_MS;
                item.occurrenceKey = due.key;
                items.add(item);
            }
            Long next = math.nextOccurrence(alarm, now);
            if (next != null) {
                Item item = baseItem(o, alarm, lang, cats, def, math);
                item.id = "a:" + alarm.id;
                item.at = next;
                item.occurrenceKey = math.occKey(next);
                items.add(item);
            }
        }
        JSONArray snoozes = store.snoozes();
        for (int i = 0; i < snoozes.length(); i++) {
            JSONObject s = snoozes.optJSONObject(i);
            if (s == null) continue;
            long at = s.optLong("at");
            if (at <= 0) continue;
            String alarmId = s.optString("alarmId");
            JSONObject alarmJson = findAlarm(alarms, alarmId);
            AlarmMath.Alarm alarm = alarmJson == null ? null : AlarmStore.toAlarm(alarmJson);
            Item item = new Item();
            item.id = "s:" + alarmId + ":" + at;
            item.alarmId = alarmId;
            item.snooze = true;
            item.snoozeAt = at;
            item.at = at <= now ? now + AlarmMath.DUE_SOON_MS : at;
            item.occurrenceKey = "";
            item.title = s.optString("title");
            if (item.title.isEmpty() && alarmJson != null) item.title = AlarmStore.titleOf(alarmJson, lang);
            item.time = "";
            item.type = s.optString("type", alarm == null ? "once" : alarm.type);
            item.sound = alarm == null ? def : math.soundFor(alarm, cats, def);
            item.vibrate = alarm == null || alarm.vibrate == null || alarm.vibrate.isEmpty() ? "short" : alarm.vibrate;
            items.add(item);
        }
        return items;
    }

    private List<Item> fallbackSchedule(long now) throws JSONException {
        List<Item> items = new ArrayList<>();
        JSONArray saved = store.savedSchedule();
        for (int i = 0; i < saved.length(); i++) {
            JSONObject o = saved.optJSONObject(i);
            if (o == null) continue;
            Item item = fromJs(o);
            if (item.id == null || item.id.isEmpty()) continue;
            if (item.at <= now) {
                if (now - item.at > AlarmMath.CATCH_UP_MS) continue;
                item.at = now + AlarmMath.DUE_SOON_MS;
            }
            items.add(item);
        }
        return items;
    }

    private static JSONObject findAlarm(JSONArray alarms, String id) {
        if (id == null) return null;
        for (int i = 0; i < alarms.length(); i++) {
            JSONObject o = alarms.optJSONObject(i);
            if (o != null && id.equals(o.optString("id"))) return o;
        }
        return null;
    }

    private Item baseItem(JSONObject o, AlarmMath.Alarm alarm, String lang, List<AlarmMath.Cat> cats, String def, AlarmMath math) {
        Item item = new Item();
        item.alarmId = alarm.id;
        item.title = AlarmStore.titleOf(o, lang);
        item.time = alarm.time == null ? "" : alarm.time;
        item.type = alarm.type == null ? "" : alarm.type;
        item.sound = math.soundFor(alarm, cats, def);
        item.vibrate = alarm.vibrate == null || alarm.vibrate.isEmpty() ? "short" : alarm.vibrate;
        item.snooze = false;
        item.snoozeAt = 0;
        return item;
    }

    private void replace(List<Item> items) throws JSONException {
        AlarmManager am = manager();
        if (am == null) return;
        cancelAll(am);
        JSONArray saved = new JSONArray();
        JSONArray ids = new JSONArray();
        for (Item item : items) {
            if (item == null || item.id == null || item.id.isEmpty() || item.at <= 0) continue;
            scheduleOne(am, item);
            ids.put(item.id);
            saved.put(toJson(item));
        }
        store.saveSchedule(saved, ids);
        Log.i(TAG, "scheduled " + ids.length() + " alarm(s), exact=" + canExact(app));
    }

    private void cancelAll(AlarmManager am) {
        JSONArray ids = store.scheduledIds();
        for (int i = 0; i < ids.length(); i++) {
            String id = ids.optString(i);
            if (id.isEmpty()) continue;
            am.cancel(fireIntent(id));
        }
    }

    private void scheduleOne(AlarmManager am, Item item) {
        long now = System.currentTimeMillis();
        long trigger = item.at < now ? now + 500 : item.at;
        Intent intent = fireIntentBase(item.id);
        intent.putExtra("id", item.id);
        intent.putExtra("alarmId", item.alarmId == null ? "" : item.alarmId);
        intent.putExtra("occurrenceKey", item.occurrenceKey == null ? "" : item.occurrenceKey);
        intent.putExtra("title", item.title == null ? "" : item.title);
        intent.putExtra("time", item.time == null ? "" : item.time);
        intent.putExtra("type", item.type == null ? "" : item.type);
        intent.putExtra("sound", item.sound == null ? "chime" : item.sound);
        intent.putExtra("vibrate", item.vibrate == null ? "short" : item.vibrate);
        intent.putExtra("snooze", item.snooze);
        intent.putExtra("snoozeAt", item.snoozeAt);
        intent.putExtra("at", item.at);
        PendingIntent op = PendingIntent.getBroadcast(app, store.codeFor(item.id), intent, flags());
        try {
            if (canExact(app)) am.setAlarmClock(new AlarmManager.AlarmClockInfo(trigger, showIntent()), op);
            else am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, op);
        } catch (SecurityException e) {
            Log.w(TAG, "exact alarm denied", e);
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, trigger, op);
        }
    }

    private PendingIntent fireIntent(String id) {
        return PendingIntent.getBroadcast(app, store.codeFor(id), fireIntentBase(id), flags());
    }

    private Intent fireIntentBase(String id) {
        Intent intent = new Intent(app, AlarmReceiver.class);
        intent.setAction(AlarmReceiver.ACTION_FIRE);
        intent.setData(Uri.parse("clockify://alarm/" + Uri.encode(id)));
        return intent;
    }

    private PendingIntent showIntent() {
        Intent show = new Intent(app, MainActivity.class);
        show.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(app, 1, show, flags());
    }

    private AlarmManager manager() {
        return (AlarmManager) app.getSystemService(Context.ALARM_SERVICE);
    }

    private static int flags() {
        return PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE;
    }

    static Item fromJs(JSONObject o) {
        Item item = new Item();
        item.id = o.optString("id");
        item.alarmId = o.optString("alarmId");
        item.at = o.optLong("at");
        item.occurrenceKey = o.optString("occurrenceKey");
        item.title = o.optString("title");
        item.time = o.optString("time");
        item.type = o.optString("type");
        item.sound = o.optString("sound", "chime");
        item.vibrate = o.optString("vibrate", "short");
        item.snooze = o.optBoolean("snooze", false);
        item.snoozeAt = o.has("snoozeAt") ? o.optLong("snoozeAt") : (item.snooze ? o.optLong("at") : 0);
        return item;
    }

    private static JSONObject toJson(Item item) throws JSONException {
        JSONObject o = new JSONObject();
        o.put("id", item.id);
        o.put("alarmId", item.alarmId == null ? "" : item.alarmId);
        o.put("at", item.at);
        o.put("occurrenceKey", item.occurrenceKey == null ? "" : item.occurrenceKey);
        o.put("title", item.title == null ? "" : item.title);
        o.put("time", item.time == null ? "" : item.time);
        o.put("type", item.type == null ? "" : item.type);
        o.put("sound", item.sound == null ? "chime" : item.sound);
        o.put("vibrate", item.vibrate == null ? "short" : item.vibrate);
        o.put("snooze", item.snooze);
        o.put("snoozeAt", item.snoozeAt);
        return o;
    }

    static final class Item {
        String id;
        String alarmId;
        long at;
        String occurrenceKey;
        String title;
        String time;
        String type;
        String sound;
        String vibrate;
        boolean snooze;
        long snoozeAt;
    }
}
