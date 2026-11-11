package site.rongershinsky.clockify;

import android.content.Context;
import android.util.Log;
import android.webkit.JavascriptInterface;

/** Page → native. The sandbox calls sync() with times from AlarmCore.nextOccurrence. */
public final class AlarmBridge {
    private final Context app;

    AlarmBridge(Context context) {
        this.app = context.getApplicationContext();
    }

    @JavascriptInterface
    public void sync(String json) {
        try {
            AlarmScheduler.get(app).syncFromJs(json == null ? "{}" : json);
        } catch (Exception e) {
            Log.e(AlarmScheduler.TAG, "bridge sync", e);
        }
    }

    @JavascriptInterface
    public String storedState() {
        try {
            return AlarmStore.open(app).storedState();
        } catch (Exception e) {
            Log.e(AlarmScheduler.TAG, "bridge state", e);
            return "";
        }
    }
}
