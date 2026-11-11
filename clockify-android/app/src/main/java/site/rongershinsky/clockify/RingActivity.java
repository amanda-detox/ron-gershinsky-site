package site.rongershinsky.clockify;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.widget.TextView;

import androidx.activity.OnBackPressedCallback;
import androidx.appcompat.app.AppCompatActivity;

public final class RingActivity extends AppCompatActivity {
    private final BroadcastReceiver changes = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (RingService.current() == null) finish();
            else bind();
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        if (Build.VERSION.SDK_INT >= 27) {
            setShowWhenLocked(true);
            setTurnScreenOn(true);
        } else {
            getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                    | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        }
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        setContentView(R.layout.activity_ring);
        findViewById(R.id.stop).setOnClickListener(v -> {
            startService(new Intent(this, RingService.class).setAction(RingService.ACTION_STOP));
        });
        findViewById(R.id.snooze).setOnClickListener(v -> {
            startService(new Intent(this, RingService.class).setAction(RingService.ACTION_SNOOZE));
        });
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                // The alarm keeps ringing until Stop or Snooze.
            }
        });
        bind();
    }

    @Override
    protected void onStart() {
        super.onStart();
        IntentFilter filter = new IntentFilter(RingService.ACTION_CHANGED);
        if (Build.VERSION.SDK_INT >= 33) registerReceiver(changes, filter, Context.RECEIVER_NOT_EXPORTED);
        else registerReceiver(changes, filter);
        bind();
    }

    @Override
    protected void onStop() {
        unregisterReceiver(changes);
        super.onStop();
    }

    private void bind() {
        boolean en = "en".equals(AlarmStore.open(this).lang());
        View root = findViewById(R.id.ring_root);
        root.setLayoutDirection(en ? View.LAYOUT_DIRECTION_LTR : View.LAYOUT_DIRECTION_RTL);
        int minutes = AlarmStore.open(this).snoozeMin();
        ((TextView) findViewById(R.id.stop)).setText(en ? "Stop" : "עצירה");
        ((TextView) findViewById(R.id.snooze)).setText(en ? "Snooze " + minutes + " min" : "נודניק " + minutes + " דק׳");
        RingService.Ring ring = RingService.current();
        String time = ring != null ? ring.time : extra("time");
        String title = ring != null ? ring.title : extra("title");
        if (time == null) time = "";
        if (title == null) title = "";
        ((TextView) findViewById(R.id.ring_time)).setText(time.isEmpty() ? "⏰" : time);
        ((TextView) findViewById(R.id.ring_title)).setText(tasks(title));
        int more = RingService.waiting();
        TextView extraView = findViewById(R.id.ring_more);
        if (more > 0) {
            extraView.setVisibility(View.VISIBLE);
            extraView.setText(en ? more + " more" : "עוד " + more);
        } else {
            extraView.setVisibility(View.GONE);
        }
    }

    private String extra(String key) {
        return getIntent() == null ? "" : getIntent().getStringExtra(key);
    }

    private static String tasks(String title) {
        if (title == null || title.isEmpty()) return "";
        String[] parts = title.split("\\s*(?:,|\\+|\\n|،)\\s*");
        if (parts.length <= 1) return title;
        StringBuilder b = new StringBuilder();
        for (String part : parts) {
            if (part.isEmpty()) continue;
            if (b.length() > 0) b.append('\n');
            b.append("• ").append(part);
        }
        return b.toString();
    }
}
