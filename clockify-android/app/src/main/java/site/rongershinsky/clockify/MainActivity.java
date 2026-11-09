package site.rongershinsky.clockify;

import android.Manifest;
import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.util.Log;
import android.webkit.ConsoleMessage;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebViewAssetLoader;

import org.json.JSONObject;

import java.lang.ref.WeakReference;

public final class MainActivity extends AppCompatActivity {
    private static WeakReference<MainActivity> live = new WeakReference<>(null);

    private WebView web;
    private AlertDialog prompt;
    private boolean askedNotif;
    private boolean waitingNotif;
    private boolean askedExact;
    private boolean askedFull;
    private boolean askedBattery;

    static void pushState(String json) {
        MainActivity activity = live.get();
        if (activity == null || activity.web == null || json == null || json.isEmpty()) return;
        String quoted = JSONObject.quote(json);
        activity.web.post(() -> activity.web.evaluateJavascript(
                "window.__clockifyApplyNativeState&&window.__clockifyApplyNativeState(" + quoted + ")", null));
    }

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        live = new WeakReference<>(this);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#0f172a"));
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setUserAgentString(settings.getUserAgentString() + " ClockifyNative/1");
        web.addJavascriptInterface(new AlarmBridge(this), "ClockifyNative");
        WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .setDomain("appassets.androidplatform.net")
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse res = loader.shouldInterceptRequest(request.getUrl());
                return withMime(request.getUrl(), res);
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onConsoleMessage(ConsoleMessage message) {
                Log.d("ClockifyWeb", message.message() + " (" + message.lineNumber() + ")");
                return true;
            }
        });
        web.loadUrl("https://appassets.androidplatform.net/assets/www/clockify-sandbox/index.html");
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (web != null && web.canGoBack()) web.goBack();
                else finish();
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        live = new WeakReference<>(this);
        maybePrompt();
    }

    @Override
    protected void onDestroy() {
        if (live.get() == this) live = new WeakReference<>(null);
        super.onDestroy();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        waitingNotif = false;
        maybePrompt();
    }

    private void maybePrompt() {
        if (isFinishing() || (prompt != null && prompt.isShowing())) return;
        if (Build.VERSION.SDK_INT >= 33
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            if (!askedNotif) {
                askedNotif = true;
                waitingNotif = true;
                ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, 21);
            }
            if (waitingNotif) return;
        }
        if (Build.VERSION.SDK_INT >= 31 && !AlarmScheduler.canExact(this) && !askedExact) {
            askedExact = true;
            prompt = new AlertDialog.Builder(this)
                    .setTitle(R.string.exact_title)
                    .setMessage(R.string.exact_body)
                    .setPositiveButton(R.string.allow, (d, w) -> openExact())
                    .setNegativeButton(R.string.later, (d, w) -> web.post(this::maybePrompt))
                    .show();
            return;
        }
        if (Build.VERSION.SDK_INT >= 34) {
            android.app.NotificationManager nm = getSystemService(android.app.NotificationManager.class);
            if (nm != null && !nm.canUseFullScreenIntent() && !askedFull) {
                askedFull = true;
                prompt = new AlertDialog.Builder(this)
                        .setTitle(R.string.full_title)
                        .setMessage(R.string.full_body)
                        .setPositiveButton(R.string.allow, (d, w) -> openFull())
                        .setNegativeButton(R.string.later, (d, w) -> web.post(this::maybePrompt))
                        .show();
                return;
            }
        }
        PowerManager pm = getSystemService(PowerManager.class);
        if (pm != null && !pm.isIgnoringBatteryOptimizations(getPackageName()) && !askedBattery) {
            askedBattery = true;
            prompt = new AlertDialog.Builder(this)
                    .setTitle(R.string.battery_title)
                    .setMessage(R.string.battery_body)
                    .setPositiveButton(R.string.allow, (d, w) -> openBattery())
                    .setNegativeButton(R.string.later, null)
                    .show();
        }
    }

    private void openExact() {
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
            intent.setData(Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        } catch (Exception e) {
            openAppSettings();
        }
    }

    private void openFull() {
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT);
            intent.setData(Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        } catch (Exception e) {
            openAppSettings();
        }
    }

    private void openBattery() {
        try {
            Intent intent = new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        } catch (Exception e) {
            try {
                startActivity(new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS));
            } catch (Exception e2) {
                openAppSettings();
            }
        }
    }

    private void openAppSettings() {
        Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        intent.setData(Uri.parse("package:" + getPackageName()));
        startActivity(intent);
    }

    private static WebResourceResponse withMime(Uri url, WebResourceResponse res) {
        if (res == null || url == null || url.getPath() == null) return res;
        String path = url.getPath();
        String mime = null;
        String encoding = "utf-8";
        if (path.endsWith(".js")) mime = "text/javascript";
        else if (path.endsWith(".css")) mime = "text/css";
        else if (path.endsWith(".html")) mime = "text/html";
        else if (path.endsWith(".svg")) mime = "image/svg+xml";
        else if (path.endsWith(".json")) mime = "application/json";
        else if (path.endsWith(".woff2")) {
            mime = "font/woff2";
            encoding = null;
        } else if (path.endsWith(".png")) {
            mime = "image/png";
            encoding = null;
        }
        if (mime == null) return res;
        return new WebResourceResponse(mime, encoding, res.getData());
    }
}
