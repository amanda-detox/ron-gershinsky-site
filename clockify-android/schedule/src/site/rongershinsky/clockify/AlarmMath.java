package site.rongershinsky.clockify;

import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.TimeZone;

/**
 * Local-time schedule math for the native alarm layer.
 * Mirrors clockify-sandbox/alarm-core.js (nextOccurrence, lastOccurrence, dueAlarms, markFired, soundFor).
 * clockify-android/tools/check-alarm-math.sh fails if this drifts from that file.
 */
public final class AlarmMath {
    public static final long CATCH_UP_MS = 30L * 60L * 1000L;
    public static final int SNOOZE_MIN_DEFAULT = 10;
    public static final long RING_MAX_MS = 5L * 60L * 1000L;
    /** How soon a catch-up or overdue snooze is handed to AlarmManager. */
    public static final long DUE_SOON_MS = 1500L;

    private final TimeZone zone;

    public AlarmMath(TimeZone zone) {
        this.zone = zone == null ? TimeZone.getDefault() : zone;
    }

    public static AlarmMath device() {
        return new AlarmMath(TimeZone.getDefault());
    }

    public static final class Alarm {
        public String id = "";
        public String time = "";
        public String type = "";
        public String date = "";
        public boolean enabled;
        public String lastFired = "";
        public long created;
        public int[] days = new int[0];
        public String sound = "";
        public String vibrate = "";
        public String cat = "";
    }

    public static final class When {
        public final long at;
        public final String key;

        public When(long at, String key) {
            this.at = at;
            this.key = key;
        }
    }

    public static final class Cat {
        public final String id;
        public final String sound;

        public Cat(String id, String sound) {
            this.id = id;
            this.sound = sound;
        }
    }

    public Long nextOccurrence(Alarm alarm, long now) {
        if (alarm == null || !alarm.enabled || parseTime(alarm.time) == null) return null;
        if ("once".equals(alarm.type)) {
            if (!validDate(alarm.date)) return null;
            long o = at(alarm.date, alarm.time);
            return o > now ? o : null;
        }
        if (intervalStep(alarm.type) != null) return nextInterval(alarm, now);
        return nextWeekday(alarm, now);
    }

    public Long lastOccurrence(Alarm alarm, long now) {
        if (alarm == null || parseTime(alarm.time) == null) return null;
        if ("once".equals(alarm.type)) {
            if (!validDate(alarm.date)) return null;
            long o = at(alarm.date, alarm.time);
            return o <= now ? o : null;
        }
        if (intervalStep(alarm.type) != null) return lastInterval(alarm, now);
        return lastWeekday(alarm, now);
    }

    public When due(Alarm alarm, long now) {
        if (alarm == null || !alarm.enabled) return null;
        Long o = lastOccurrence(alarm, now);
        if (o == null) return null;
        if (now - o > CATCH_UP_MS) return null;
        String key = occKey(o);
        if (key.equals(alarm.lastFired == null ? "" : alarm.lastFired)) return null;
        if (alarm.created != 0 && o < alarm.created) return null;
        return new When(o, key);
    }

    public void markFired(Alarm alarm, String key) {
        if (alarm == null) return;
        alarm.lastFired = key == null ? "" : key;
        if ("once".equals(alarm.type)) alarm.enabled = false;
    }

    public String soundFor(Alarm alarm, List<Cat> cats, String defSound) {
        if (alarm != null && "none".equals(alarm.sound)) return "none";
        if (alarm != null && alarm.sound != null && !alarm.sound.isEmpty()) return alarm.sound;
        if (alarm != null && alarm.cat != null && cats != null) {
            for (int i = 0; i < cats.size(); i++) {
                Cat c = cats.get(i);
                if (c != null && alarm.cat.equals(c.id) && c.sound != null && !c.sound.isEmpty()) return c.sound;
            }
        }
        if (defSound != null && !defSound.isEmpty()) return defSound;
        return "chime";
    }

    public String occKey(long ms) {
        Calendar c = cal(ms);
        return dateKey(ms) + " " + pad(c.get(Calendar.HOUR_OF_DAY)) + ":" + pad(c.get(Calendar.MINUTE));
    }

    public String dateKey(long ms) {
        Calendar c = cal(ms);
        return c.get(Calendar.YEAR) + "-" + pad(c.get(Calendar.MONTH) + 1) + "-" + pad(c.get(Calendar.DAY_OF_MONTH));
    }

    private Long nextWeekday(Alarm alarm, long now) {
        int[] p = parseTime(alarm.time);
        int[] days = daysOf(alarm);
        Calendar base = cal(now);
        int y = base.get(Calendar.YEAR);
        int m = base.get(Calendar.MONTH);
        int d = base.get(Calendar.DAY_OF_MONTH);
        for (int i = 0; i < 8; i++) {
            long at = ymd(y, m, d + i, p[0], p[1]);
            if (at > now && contains(days, jsDay(at))) return at;
        }
        return null;
    }

    private Long lastWeekday(Alarm alarm, long now) {
        int[] p = parseTime(alarm.time);
        int[] days = daysOf(alarm);
        Calendar base = cal(now);
        int y = base.get(Calendar.YEAR);
        int m = base.get(Calendar.MONTH);
        int d = base.get(Calendar.DAY_OF_MONTH);
        for (int i = 0; i < 8; i++) {
            long at = ymd(y, m, d - i, p[0], p[1]);
            if (at <= now && contains(days, jsDay(at))) return at;
        }
        return null;
    }

    private Long nextInterval(Alarm alarm, long now) {
        int[] p = parseTime(alarm.time);
        String[] step = intervalStep(alarm.type);
        if (p == null || step == null || !validDate(alarm.date)) return null;
        long start = at(alarm.date, alarm.time);
        if (start > now) return start;
        int k = estimateK(start, now, step);
        long occ = shiftFrom(start, step, k, p[0], p[1]);
        int guard = 0;
        while (occ <= now && guard < 8) {
            k++;
            occ = shiftFrom(start, step, k, p[0], p[1]);
            guard++;
        }
        while (k > 0 && shiftFrom(start, step, k - 1, p[0], p[1]) > now && guard < 16) {
            k--;
            occ = shiftFrom(start, step, k, p[0], p[1]);
            guard++;
        }
        return occ > now ? occ : null;
    }

    private Long lastInterval(Alarm alarm, long now) {
        int[] p = parseTime(alarm.time);
        String[] step = intervalStep(alarm.type);
        if (p == null || step == null || !validDate(alarm.date)) return null;
        long start = at(alarm.date, alarm.time);
        if (start > now) return null;
        Long nxt = nextInterval(alarm, now);
        if (nxt == null) return start;
        int k = estimateK(start, nxt, step);
        long occ = shiftFrom(start, step, k, p[0], p[1]);
        int guard = 0;
        while (occ < nxt && guard < 6) {
            k++;
            occ = shiftFrom(start, step, k, p[0], p[1]);
            guard++;
        }
        while (occ > nxt && k > 0 && guard < 12) {
            k--;
            occ = shiftFrom(start, step, k, p[0], p[1]);
            guard++;
        }
        if (k <= 0) return start <= now ? start : null;
        long prev = shiftFrom(start, step, k - 1, p[0], p[1]);
        return prev <= now ? prev : null;
    }

    /** kind, n. day / month / year. */
    private static String[] intervalStep(String type) {
        if ("d28".equals(type)) return new String[]{"day", "28"};
        if ("monthly".equals(type)) return new String[]{"month", "1"};
        if ("yearly".equals(type)) return new String[]{"year", "1"};
        if ("y5".equals(type)) return new String[]{"year", "5"};
        if ("decade".equals(type)) return new String[]{"year", "10"};
        return null;
    }

    private long shiftFrom(long startMs, String[] step, int k, int h, int mi) {
        Calendar start = cal(startMs);
        String kind = step[0];
        int n = Integer.parseInt(step[1]);
        if ("day".equals(kind)) {
            return ymd(start.get(Calendar.YEAR), start.get(Calendar.MONTH), start.get(Calendar.DAY_OF_MONTH) + n * k, h, mi);
        }
        if ("month".equals(kind)) {
            int total = start.get(Calendar.YEAR) * 12 + start.get(Calendar.MONTH) + n * k;
            int y = Math.floorDiv(total, 12);
            int m = Math.floorMod(total, 12);
            int day = Math.min(start.get(Calendar.DAY_OF_MONTH), daysInMonth(y, m));
            return ymd(y, m, day, h, mi);
        }
        int y2 = start.get(Calendar.YEAR) + n * k;
        int m2 = start.get(Calendar.MONTH);
        int day = Math.min(start.get(Calendar.DAY_OF_MONTH), daysInMonth(y2, m2));
        return ymd(y2, m2, day, h, mi);
    }

    private int estimateK(long start, long now, String[] step) {
        String kind = step[0];
        int n = Integer.parseInt(step[1]);
        int k;
        if ("day".equals(kind)) {
            k = (int) Math.floor((now - start) / (double) (n * 86400000L));
        } else if ("month".equals(kind)) {
            Calendar s = cal(start);
            Calendar w = cal(now);
            k = (int) Math.floor(((w.get(Calendar.YEAR) - s.get(Calendar.YEAR)) * 12L
                    + (w.get(Calendar.MONTH) - s.get(Calendar.MONTH))) / (double) n);
        } else {
            Calendar s = cal(start);
            Calendar w = cal(now);
            k = (int) Math.floor((w.get(Calendar.YEAR) - s.get(Calendar.YEAR)) / (double) n);
        }
        return Math.max(k, 0);
    }

    private int[] daysOf(Alarm alarm) {
        int[] cleaned = cleanDays(alarm == null ? null : alarm.days);
        if (cleaned.length > 0) return cleaned;
        return new int[]{0, 1, 2, 3, 4, 5, 6};
    }

    private static int[] cleanDays(int[] list) {
        if (list == null || list.length == 0) return new int[0];
        List<Integer> out = new ArrayList<Integer>();
        for (int d : list) {
            if (d >= 0 && d <= 6 && !out.contains(d)) out.add(d);
        }
        out.sort(Integer::compareTo);
        int[] arr = new int[out.size()];
        for (int i = 0; i < out.size(); i++) arr[i] = out.get(i);
        return arr;
    }

    private static boolean contains(int[] days, int day) {
        for (int d : days) if (d == day) return true;
        return false;
    }

    private int jsDay(long ms) {
        return cal(ms).get(Calendar.DAY_OF_WEEK) - Calendar.SUNDAY;
    }

    private int daysInMonth(int year, int month) {
        Calendar c = Calendar.getInstance(zone);
        c.clear();
        c.set(Calendar.YEAR, year);
        c.set(Calendar.MONTH, month);
        c.set(Calendar.DAY_OF_MONTH, 1);
        c.set(Calendar.HOUR_OF_DAY, 0);
        return c.getActualMaximum(Calendar.DAY_OF_MONTH);
    }

    private long at(String dayStr, String time) {
        int[] p = parseTime(time);
        String[] d = dayStr.split("-");
        return ymd(Integer.parseInt(d[0]), Integer.parseInt(d[1]) - 1, Integer.parseInt(d[2]), p[0], p[1]);
    }

    private long ymd(int year, int month, int day, int hour, int minute) {
        Calendar c = Calendar.getInstance(zone);
        c.clear();
        c.set(year, month, day, hour, minute, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis();
    }

    private Calendar cal(long ms) {
        Calendar c = Calendar.getInstance(zone);
        c.setTimeInMillis(ms);
        return c;
    }

    static int[] parseTime(String t) {
        if (t == null) return null;
        int colon = t.indexOf(':');
        if (colon <= 0 || colon >= t.length() - 1) return null;
        try {
            int h = Integer.parseInt(t.substring(0, colon));
            int mi = Integer.parseInt(t.substring(colon + 1));
            if (h > 23 || mi > 59 || h < 0 || mi < 0) return null;
            if (t.substring(colon + 1).length() != 2) return null;
            return new int[]{h, mi};
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static boolean validDate(String s) {
        return s != null && s.matches("\\d{4}-\\d{2}-\\d{2}");
    }

    private static String pad(int n) {
        return (n < 10 ? "0" : "") + n;
    }
}
