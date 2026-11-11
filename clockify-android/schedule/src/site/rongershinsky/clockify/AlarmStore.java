package site.rongershinsky.clockify;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/** Device-protected copy of the sandbox keys (rg-sbx-clockify-*). Readable on boot before unlock. */
public final class AlarmStore {
    public static final String PREFS = "rg-sbx-clockify";
    public static final String ALARMS = "rg-sbx-clockify-alarms-v1";
    public static final String SNOOZES = "rg-sbx-clockify-snoozes-v1";
    public static final String CATS = "rg-sbx-clockify-cats-v1";
    public static final String DEFSOUND = "rg-sbx-clockify-defsound-v1";
    public static final String REV = "rg-sbx-clockify-rev";
    public static final String LANG = "rg-sbx-clockify-lang";
    public static final String SNOOZE_MIN = "rg-sbx-clockify-snooze-min";
    public static final String RING_TOKEN = "rg-sbx-clockify-ring-token";
    static final String SCHEDULE = "rg-sbx-clockify-schedule";
    static final String SCHEDULED_IDS = "rg-sbx-clockify-scheduled-ids";
    static final String CODES = "rg-sbx-clockify-codes";
    static final String CODE_NEXT = "rg-sbx-clockify-code-next";
    static final String ACTIVE = "rg-sbx-clockify-active-ring";

    private final SharedPreferences prefs;

    private AlarmStore(SharedPreferences prefs) {
        this.prefs = prefs;
    }

    public static AlarmStore open(Context ctx) {
        Context safe = ctx.isDeviceProtectedStorage() ? ctx : ctx.createDeviceProtectedStorageContext();
        return new AlarmStore(safe.getSharedPreferences(PREFS, Context.MODE_PRIVATE));
    }

    public synchronized boolean hasState() {
        return prefs.contains(ALARMS);
    }

    public synchronized void applyPayload(JSONObject payload) throws JSONException {
        SharedPreferences.Editor editor = prefs.edit();
        if (payload.has("alarms")) editor.putString(ALARMS, payload.getJSONArray("alarms").toString());
        if (payload.has("snoozes")) editor.putString(SNOOZES, payload.getJSONArray("snoozes").toString());
        if (payload.has("cats")) editor.putString(CATS, payload.getJSONArray("cats").toString());
        if (payload.has("defSound")) editor.putString(DEFSOUND, payload.optString("defSound", "chime"));
        if (payload.has("lang")) editor.putString(LANG, "en".equals(payload.optString("lang")) ? "en" : "he");
        if (payload.has("snoozeMin")) editor.putInt(SNOOZE_MIN, Math.max(1, payload.optInt("snoozeMin", AlarmMath.SNOOZE_MIN_DEFAULT)));
        if (payload.has("rev")) editor.putInt(REV, payload.optInt("rev", 0));
        editor.commit();
    }

    public synchronized String storedState() {
        if (!hasState()) return "";
        try {
            JSONObject o = new JSONObject();
            o.put("alarms", alarms());
            o.put("snoozes", snoozes());
            o.put("cats", new JSONArray(prefs.getString(CATS, "[]")));
            o.put("defSound", defSound());
            o.put("lang", lang());
            o.put("snoozeMin", snoozeMin());
            o.put("rev", prefs.getInt(REV, 0));
            return o.toString();
        } catch (JSONException e) {
            return "";
        }
    }

    public synchronized JSONArray alarms() {
        return array(ALARMS);
    }

    public synchronized JSONArray snoozes() {
        return array(SNOOZES);
    }

    public synchronized List<AlarmMath.Cat> cats() {
        List<AlarmMath.Cat> out = new ArrayList<>();
        JSONArray arr = array(CATS);
        for (int i = 0; i < arr.length(); i++) {
            JSONObject c = arr.optJSONObject(i);
            if (c == null) continue;
            out.add(new AlarmMath.Cat(c.optString("id"), c.optString("sound")));
        }
        return out;
    }

    public synchronized String defSound() {
        String s = prefs.getString(DEFSOUND, "chime");
        return s == null || s.isEmpty() ? "chime" : s;
    }

    public synchronized String lang() {
        return "en".equals(prefs.getString(LANG, "he")) ? "en" : "he";
    }

    public synchronized int snoozeMin() {
        int n = prefs.getInt(SNOOZE_MIN, AlarmMath.SNOOZE_MIN_DEFAULT);
        return n <= 0 ? AlarmMath.SNOOZE_MIN_DEFAULT : n;
    }

    public synchronized void markFired(String alarmId, String key) {
        if (alarmId == null || alarmId.isEmpty()) return;
        try {
            JSONArray arr = alarms();
            boolean found = false;
            AlarmMath math = AlarmMath.device();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.optJSONObject(i);
                if (o == null || !alarmId.equals(o.optString("id"))) continue;
                AlarmMath.Alarm alarm = toAlarm(o);
                math.markFired(alarm, key == null ? "" : key);
                o.put("lastFired", alarm.lastFired);
                o.put("enabled", alarm.enabled);
                found = true;
            }
            if (found) {
                prefs.edit().putString(ALARMS, arr.toString()).putInt(REV, prefs.getInt(REV, 0) + 1).commit();
            }
        } catch (JSONException ignored) {
        }
    }

    public synchronized void removeSnooze(String alarmId, long at) {
        JSONArray arr = snoozes();
        JSONArray keep = new JSONArray();
        for (int i = 0; i < arr.length(); i++) {
            JSONObject s = arr.optJSONObject(i);
            if (s == null) continue;
            boolean sameId = alarmId != null && alarmId.equals(s.optString("alarmId"));
            boolean sameAt = at > 0 && s.optLong("at") == at;
            if (sameId && sameAt) continue;
            keep.put(s);
        }
        prefs.edit().putString(SNOOZES, keep.toString()).putInt(REV, prefs.getInt(REV, 0) + 1).commit();
    }

    public synchronized long addSnooze(String alarmId, String title, String type) {
        long at = System.currentTimeMillis() + snoozeMin() * 60_000L;
        try {
            JSONArray arr = snoozes();
            JSONObject s = new JSONObject();
            s.put("at", at);
            s.put("alarmId", alarmId == null ? "" : alarmId);
            s.put("title", title == null ? "" : title);
            s.put("type", type == null ? "" : type);
            arr.put(s);
            prefs.edit().putString(SNOOZES, arr.toString()).putInt(REV, prefs.getInt(REV, 0) + 1).commit();
        } catch (JSONException ignored) {
        }
        return at;
    }

    public synchronized void rememberRing(String token, String alarmId, String title, String type) {
        try {
            JSONObject o = new JSONObject();
            o.put("token", token == null ? "" : token);
            o.put("alarmId", alarmId == null ? "" : alarmId);
            o.put("title", title == null ? "" : title);
            o.put("type", type == null ? "" : type);
            prefs.edit().putString(ACTIVE, o.toString()).putString(RING_TOKEN, token == null ? "" : token).commit();
        } catch (JSONException ignored) {
        }
    }

    public synchronized JSONObject activeRing() {
        try {
            return new JSONObject(prefs.getString(ACTIVE, "{}"));
        } catch (JSONException e) {
            return new JSONObject();
        }
    }

    public synchronized void clearRing() {
        prefs.edit().remove(ACTIVE).putString(RING_TOKEN, "").commit();
    }

    synchronized void saveSchedule(JSONArray items, JSONArray ids) {
        prefs.edit().putString(SCHEDULE, items.toString()).putString(SCHEDULED_IDS, ids.toString()).commit();
    }

    synchronized JSONArray scheduledIds() {
        return array(SCHEDULED_IDS);
    }

    synchronized JSONArray savedSchedule() {
        return array(SCHEDULE);
    }

    synchronized int codeFor(String id) {
        try {
            JSONObject map = new JSONObject(prefs.getString(CODES, "{}"));
            if (map.has(id)) return map.getInt(id);
            int next = prefs.getInt(CODE_NEXT, 1000) + 1;
            map.put(id, next);
            prefs.edit().putString(CODES, map.toString()).putInt(CODE_NEXT, next).commit();
            return next;
        } catch (JSONException e) {
            return id.hashCode() & 0x7fffffff;
        }
    }

    public static AlarmMath.Alarm toAlarm(JSONObject o) {
        AlarmMath.Alarm a = new AlarmMath.Alarm();
        a.id = o.optString("id", "");
        a.time = o.optString("time", "");
        a.type = o.optString("type", "");
        a.date = o.optString("date", "");
        a.enabled = o.optBoolean("enabled", false);
        a.lastFired = o.optString("lastFired", "");
        a.created = o.optLong("created", 0);
        a.sound = o.optString("sound", "");
        a.vibrate = o.optString("vibrate", "short");
        a.cat = o.optString("cat", "");
        JSONArray days = o.optJSONArray("days");
        if (days != null) {
            a.days = new int[days.length()];
            for (int i = 0; i < days.length(); i++) a.days[i] = days.optInt(i, -1);
        }
        return a;
    }

    public static String titleOf(JSONObject alarm, String lang) {
        if (alarm == null) return "";
        Object t = alarm.opt("title");
        if (t instanceof String) return (String) t;
        if (t instanceof JSONObject) {
            JSONObject o = (JSONObject) t;
            String v = o.optString(lang == null ? "he" : lang, "");
            if (v.isEmpty()) v = o.optString("he", "");
            if (v.isEmpty()) v = o.optString("en", "");
            return v;
        }
        return "";
    }

    private JSONArray array(String key) {
        try {
            return new JSONArray(prefs.getString(key, "[]"));
        } catch (JSONException e) {
            return new JSONArray();
        }
    }
}
