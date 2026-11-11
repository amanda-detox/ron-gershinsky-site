package site.rongershinsky.clockify;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.IBinder;
import android.os.PowerManager;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import android.util.Log;

import androidx.core.app.NotificationCompat;

import java.util.ArrayList;
import java.util.List;

/** Loops the alarm sound and vibration while a full-screen alarm notification is showing. */
public final class RingService extends Service {
    public static final String ACTION_RING = "site.rongershinsky.clockify.RING";
    public static final String ACTION_STOP = "site.rongershinsky.clockify.STOP";
    public static final String ACTION_SNOOZE = "site.rongershinsky.clockify.SNOOZE";
    public static final String ACTION_CHANGED = "site.rongershinsky.clockify.RING_CHANGED";
    static final String CHANNEL = "clockify-alarm";
    private static final int NOTIF = 42;

    private static final List<Ring> queue = new ArrayList<>();

    private MediaPlayer player;
    private Vibrator vibrator;
    private PowerManager.WakeLock wakeLock;
    private boolean foreground;

    public static final class Ring {
        public String alarmId = "";
        public String title = "";
        public String time = "";
        public String type = "";
        public String sound = "chime";
        public String vibrate = "short";
        public boolean snooze;
        public String token = "";
    }

    public static Ring current() {
        synchronized (queue) {
            return queue.isEmpty() ? null : queue.get(0);
        }
    }

    public static int waiting() {
        synchronized (queue) {
            return Math.max(0, queue.size() - 1);
        }
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent == null ? ACTION_RING : intent.getAction();
        if (ACTION_STOP.equals(action)) {
            dismiss(false);
            return START_NOT_STICKY;
        }
        if (ACTION_SNOOZE.equals(action)) {
            dismiss(true);
            return queueEmpty() ? START_NOT_STICKY : START_STICKY;
        }
        Ring ring = fromIntent(intent);
        if (ring != null) {
            boolean first;
            synchronized (queue) {
                first = queue.isEmpty();
                queue.add(ring);
            }
            if (first) beginCurrent();
            else refresh();
        }
        ensureForeground();
        return START_STICKY;
    }

    private void beginCurrent() {
        Ring ring = current();
        if (ring == null) return;
        ring.token = (ring.alarmId == null ? "x" : ring.alarmId) + ":" + System.currentTimeMillis();
        acquireWake();
        startOutput(ring);
        AlarmScheduler.get(this).rememberRing(ring.token, ring.alarmId, ring.title, ring.type);
        ensureForeground();
        announce();
    }

    private void dismiss(boolean snooze) {
        Ring cur;
        synchronized (queue) {
            cur = queue.isEmpty() ? null : queue.remove(0);
        }
        if (snooze && cur != null) {
            AlarmScheduler.get(this).snoozeCurrent(cur.alarmId, cur.title, cur.type);
        }
        if (queueEmpty()) {
            stopOutput();
            releaseWake();
            AlarmScheduler.get(this).clearRing();
            if (foreground) {
                stopForeground(STOP_FOREGROUND_REMOVE);
                foreground = false;
            }
            notificationManager().cancel(NOTIF);
            announce();
            stopSelf();
            return;
        }
        beginCurrent();
    }

    private boolean queueEmpty() {
        synchronized (queue) {
            return queue.isEmpty();
        }
    }

    private void refresh() {
        ensureForeground();
        announce();
    }

    private void ensureForeground() {
        Notification notification = buildNotification(false);
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(NOTIF, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        } else {
            startForeground(NOTIF, notification);
        }
        foreground = true;
    }

    private Notification buildNotification(boolean withSound) {
        createChannel(this, withSound ? currentSound() : null);
        Ring ring = current();
        boolean en = "en".equals(AlarmStore.open(this).lang());
        String title = ring == null ? "Clockify" : (ring.time == null || ring.time.isEmpty() ? ring.title : ring.time);
        String text = ring == null ? "" : ring.title;
        int extra = waiting();
        if (extra > 0) text = text + (en ? "  +" + extra : "  +" + extra);
        NotificationCompat.Builder b = new NotificationCompat.Builder(this, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_alarm)
                .setContentTitle(title == null || title.isEmpty() ? "Clockify" : title)
                .setContentText(text)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setOngoing(true)
                .setAutoCancel(false)
                .setContentIntent(activityIntent())
                .setFullScreenIntent(activityIntent(), true)
                .addAction(0, en ? "Stop" : "עצירה", serviceIntent(ACTION_STOP))
                .addAction(0, en ? "Snooze" : "נודניק", serviceIntent(ACTION_SNOOZE))
                .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE);
        return b.build();
    }

    private String currentSound() {
        Ring ring = current();
        return ring == null ? "chime" : ring.sound;
    }

    private PendingIntent activityIntent() {
        Intent i = new Intent(this, RingActivity.class);
        i.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        return PendingIntent.getActivity(this, 7, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private PendingIntent serviceIntent(String action) {
        Intent i = new Intent(this, RingService.class);
        i.setAction(action);
        return PendingIntent.getService(this, action.hashCode(), i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void startOutput(Ring ring) {
        stopOutput();
        String sound = ring.sound == null ? "chime" : ring.sound;
        int res = soundRes(sound);
        if (res != 0) {
            try {
                MediaPlayer mp = new MediaPlayer();
                mp.setAudioAttributes(new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build());
                mp.setDataSource(this, Uri.parse("android.resource://" + getPackageName() + "/" + res));
                mp.setLooping(true);
                mp.prepare();
                mp.start();
                player = mp;
            } catch (Exception e) {
                Log.e(AlarmScheduler.TAG, "sound " + sound, e);
            }
        }
        startVibration(ring.vibrate);
    }

    private void stopOutput() {
        if (player != null) {
            try {
                player.stop();
            } catch (Exception ignored) {
            }
            player.release();
            player = null;
        }
        if (vibrator != null) vibrator.cancel();
    }

    private void startVibration(String kind) {
        long[] pattern = vibration(kind);
        if (pattern == null) return;
        Vibrator v = vibrator();
        if (v == null) return;
        VibrationEffect effect = VibrationEffect.createWaveform(pattern, 0);
        if (Build.VERSION.SDK_INT >= 33) {
            v.vibrate(effect, android.os.VibrationAttributes.createForUsage(android.os.VibrationAttributes.USAGE_ALARM));
        } else {
            v.vibrate(effect);
        }
    }

    static long[] vibration(String kind) {
        if ("none".equals(kind)) return null;
        if ("long".equals(kind)) return new long[]{0, 1000, 300, 1000};
        if ("continuous".equals(kind)) return new long[]{0, 800, 200};
        return new long[]{0, 400, 200, 400, 1200};
    }

    private Vibrator vibrator() {
        if (vibrator != null) return vibrator;
        if (Build.VERSION.SDK_INT >= 31) {
            VibratorManager vm = (VibratorManager) getSystemService(Context.VIBRATOR_MANAGER_SERVICE);
            vibrator = vm == null ? null : vm.getDefaultVibrator();
        } else {
            vibrator = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
        }
        return vibrator;
    }

    static int soundRes(String id) {
        if (id == null || "none".equals(id) || id.isEmpty()) return 0;
        switch (id) {
            case "classic": return R.raw.snd_classic;
            case "rising": return R.raw.snd_rising;
            case "bell": return R.raw.snd_bell;
            case "digital": return R.raw.snd_digital;
            case "birds": return R.raw.snd_birds;
            case "marimba": return R.raw.snd_marimba;
            case "gong": return R.raw.snd_gong;
            case "piano": return R.raw.snd_piano;
            case "chime": return R.raw.snd_chime;
            default: return R.raw.snd_chime;
        }
    }

    private void acquireWake() {
        if (wakeLock != null && wakeLock.isHeld()) return;
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        if (pm == null) return;
        wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "clockify:ring");
        wakeLock.setReferenceCounted(false);
        wakeLock.acquire(AlarmMath.RING_MAX_MS + 30_000L);
    }

    private void releaseWake() {
        if (wakeLock != null && wakeLock.isHeld()) wakeLock.release();
        wakeLock = null;
    }

    private void announce() {
        Intent i = new Intent(ACTION_CHANGED);
        i.setPackage(getPackageName());
        sendBroadcast(i);
    }

    private NotificationManager notificationManager() {
        return (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
    }

    private static void createChannel(Context ctx, String soundOrNull) {
        NotificationManager nm = (NotificationManager) ctx.getSystemService(NOTIFICATION_SERVICE);
        if (nm == null || nm.getNotificationChannel(CHANNEL) != null) return;
        NotificationChannel channel = new NotificationChannel(CHANNEL, "Clockify", NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription("Alarm");
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        channel.enableVibration(false);
        channel.setSound(null, null);
        channel.setBypassDnd(true);
        nm.createNotificationChannel(channel);
        if (soundOrNull != null) {
            // The looping sound is played by MediaPlayer. The channel stays silent so it does not double.
        }
    }

    static void postFallback(Context ctx, Intent source) {
        createChannel(ctx, null);
        String sound = source == null ? "chime" : source.getStringExtra("sound");
        int res = soundRes(sound);
        String channelId = CHANNEL;
        if (res != 0) {
            channelId = "clockify-tone-" + sound;
            NotificationManager nm = (NotificationManager) ctx.getSystemService(NOTIFICATION_SERVICE);
            if (nm != null && nm.getNotificationChannel(channelId) == null) {
                NotificationChannel ch = new NotificationChannel(channelId, "Clockify", NotificationManager.IMPORTANCE_HIGH);
                AudioAttributes attrs = new AudioAttributes.Builder()
                        .setUsage(AudioAttributes.USAGE_ALARM)
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .build();
                ch.setSound(Uri.parse("android.resource://" + ctx.getPackageName() + "/" + res), attrs);
                ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
                nm.createNotificationChannel(ch);
            }
        }
        String title = source == null ? "Clockify" : source.getStringExtra("time");
        String text = source == null ? "" : source.getStringExtra("title");
        Intent activity = new Intent(ctx, RingActivity.class);
        activity.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        if (source != null && source.getExtras() != null) activity.putExtras(source);
        PendingIntent pi = PendingIntent.getActivity(ctx, 8, activity, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        Notification n = new NotificationCompat.Builder(ctx, channelId)
                .setSmallIcon(R.drawable.ic_stat_alarm)
                .setContentTitle(title == null || title.isEmpty() ? "Clockify" : title)
                .setContentText(text == null ? "" : text)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setFullScreenIntent(pi, true)
                .setContentIntent(pi)
                .setAutoCancel(false)
                .build();
        NotificationManager nm = (NotificationManager) ctx.getSystemService(NOTIFICATION_SERVICE);
        if (nm != null) nm.notify(NOTIF, n);
    }

    private static Ring fromIntent(Intent intent) {
        if (intent == null) return null;
        Ring ring = new Ring();
        ring.alarmId = intent.getStringExtra("alarmId");
        ring.title = intent.getStringExtra("title");
        ring.time = intent.getStringExtra("time");
        ring.type = intent.getStringExtra("type");
        ring.sound = intent.getStringExtra("sound");
        ring.vibrate = intent.getStringExtra("vibrate");
        ring.snooze = intent.getBooleanExtra("snooze", false);
        if (ring.sound == null || ring.sound.isEmpty()) ring.sound = "chime";
        if (ring.vibrate == null || ring.vibrate.isEmpty()) ring.vibrate = "short";
        if (ring.title == null) ring.title = "";
        if (ring.time == null) ring.time = "";
        if ((ring.title.isEmpty() && ring.time.isEmpty() && (ring.alarmId == null || ring.alarmId.isEmpty()))) return null;
        return ring;
    }

    @Override
    public void onDestroy() {
        stopOutput();
        releaseWake();
        synchronized (queue) {
            queue.clear();
        }
        super.onDestroy();
    }
}
