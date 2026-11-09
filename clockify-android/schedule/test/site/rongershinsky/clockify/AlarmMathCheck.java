package site.rongershinsky.clockify;

import org.json.JSONArray;
import org.json.JSONObject;

import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.TimeZone;

/** Compares AlarmMath with timestamps produced by clockify-sandbox/alarm-core.js. */
public final class AlarmMathCheck {
    public static void main(String[] args) throws Exception {
        String raw = Files.readString(Paths.get(args[0]));
        JSONArray cases = new JSONObject(raw).getJSONArray("cases");
        AlarmMath math = new AlarmMath(TimeZone.getDefault());
        List<AlarmMath.Cat> cats = Arrays.asList(
                new AlarmMath.Cat("c-travel", "rising"),
                new AlarmMath.Cat("c-practice", "marimba"),
                new AlarmMath.Cat("c-care", "piano"));
        int failed = 0;
        for (int i = 0; i < cases.length(); i++) {
            JSONObject c = cases.getJSONObject(i);
            AlarmMath.Alarm alarm = alarm(c.getJSONObject("alarm"));
            long now = c.getLong("now");
            failed += eqTime(c, "next", math.nextOccurrence(alarm, now));
            failed += eqTime(c, "last", math.lastOccurrence(alarm, now));
            AlarmMath.When due = math.due(alarm, now);
            String gotDue = due == null ? null : due.key;
            String expectDue = c.isNull("due") ? null : c.getString("due");
            if (!Objects.equals(gotDue, expectDue)) {
                System.err.println("FAIL " + c.getString("name") + " due " + gotDue + " != " + expectDue);
                failed++;
            }
            String sound = math.soundFor(alarm, cats, "chime");
            if (!sound.equals(c.getString("sound"))) {
                System.err.println("FAIL " + c.getString("name") + " sound " + sound + " != " + c.getString("sound"));
                failed++;
            }
        }
        if (failed > 0) {
            System.err.println(failed + " failed");
            System.exit(1);
        }
        System.out.println("ok " + cases.length() + " schedule cases in " + TimeZone.getDefault().getID());
    }

    private static int eqTime(JSONObject c, String field, Long got) {
        Long expect = c.isNull(field) ? null : c.getLong(field);
        if (Objects.equals(expect, got)) return 0;
        System.err.println("FAIL " + c.getString("name") + " " + field + " " + got + " != " + expect);
        return 1;
    }

    private static AlarmMath.Alarm alarm(JSONObject o) {
        AlarmMath.Alarm a = new AlarmMath.Alarm();
        a.id = o.optString("id", "");
        a.time = o.optString("time", "");
        a.type = o.optString("type", "");
        a.date = o.optString("date", "");
        a.enabled = o.optBoolean("enabled", false);
        a.lastFired = o.optString("lastFired", "");
        a.created = o.optLong("created", 0);
        a.sound = o.optString("sound", "");
        a.vibrate = o.optString("vibrate", "");
        a.cat = o.optString("cat", "");
        JSONArray days = o.optJSONArray("days");
        if (days != null) {
            a.days = new int[days.length()];
            for (int i = 0; i < days.length(); i++) a.days[i] = days.getInt(i);
        }
        return a;
    }
}
