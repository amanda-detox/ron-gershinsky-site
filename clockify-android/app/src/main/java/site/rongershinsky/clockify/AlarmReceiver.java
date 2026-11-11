package site.rongershinsky.clockify;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

public final class AlarmReceiver extends BroadcastReceiver {
    public static final String ACTION_FIRE = "site.rongershinsky.clockify.FIRE";
    public static final String ACTION_AUTO = "site.rongershinsky.clockify.AUTO";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        Context app = context.getApplicationContext();
        if (ACTION_AUTO.equals(intent.getAction())) {
            AlarmScheduler.get(app).onAuto(intent.getStringExtra("token"));
            return;
        }
        if (ACTION_FIRE.equals(intent.getAction())) {
            AlarmScheduler.get(app).onFired(intent);
        }
    }
}
