package org.sajag.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebView;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import java.util.Objects;

public class MainActivity extends BridgeActivity {
    private boolean backPending;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        Intent launchIntent = getIntent();
        String sharedText = "";
        if (isShareIntent(launchIntent)) {
            // Android may restore its original SEND intent after process death.
            // Always sanitize it, but never replay that old text on restoration.
            if (savedInstanceState == null) sharedText = readSharedText(launchIntent);
            // Capacitor reads extras/data while constructing its bridge, before
            // its initial onNewIntent callback. Sanitize the cold launch first.
            setIntent(cleanLaunchIntent());
        }
        registerPlugin(SajagVoicePlugin.class);
        super.onCreate(savedInstanceState);
        installBackNavigation();
        openSharedText(sharedText);
    }

    private void installBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (backPending) return;
                Bridge currentBridge = getBridge();
                WebView webView = currentBridge == null ? null : currentBridge.getWebView();
                if (webView == null || currentBridge.getServerUrl() != null ||
                    !isBundledPage(currentBridge.getLocalUrl(), webView.getUrl())) {
                    defaultBack(this);
                    return;
                }
                backPending = true;
                // React cancels this event when it closes a modal or returns Home.
                // No route, share text or credentials are interpolated into JS.
                webView.evaluateJavascript(
                    "!window.dispatchEvent(new Event('sajag:native-back', {cancelable:true}))",
                    handled -> {
                        backPending = false;
                        if (isFinishing() || isDestroyed() || "true".equals(handled)) return;
                        String currentUrl = webView.getUrl();
                        if (isBundledPage(currentBridge.getLocalUrl(), currentUrl) &&
                            !"/".equals(Uri.parse(currentUrl).getPath())) {
                            // During startup React may not have registered yet.
                            // Return to the bundled Home screen instead of exiting.
                            webView.loadUrl(Uri.parse(currentBridge.getLocalUrl()).buildUpon()
                                .path("/").clearQuery().fragment(null).build().toString());
                        } else {
                            defaultBack(this);
                        }
                    }
                );
            }
        });
    }

    private void defaultBack(OnBackPressedCallback callback) {
        callback.setEnabled(false);
        try {
            getOnBackPressedDispatcher().onBackPressed();
        } finally {
            callback.setEnabled(true);
        }
    }

    private static boolean isBundledPage(String localUrl, String pageUrl) {
        if (localUrl == null || pageUrl == null) return false;
        Uri local = Uri.parse(localUrl);
        Uri page = Uri.parse(pageUrl);
        return Objects.equals(local.getScheme(), page.getScheme()) &&
            Objects.equals(local.getHost(), page.getHost()) &&
            local.getPort() == page.getPort();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        if (!isShareIntent(intent)) {
            super.onNewIntent(intent);
            return;
        }

        String sharedText = readSharedText(intent);

        // Keep text/ClipData out of this Activity's retained launch intent and
        // plugin callbacks after the one-time capture.
        Intent cleanIntent = cleanLaunchIntent();
        setIntent(cleanIntent);
        super.onNewIntent(cleanIntent);
        openSharedText(sharedText);
    }

    private void openSharedText(String sharedText) {
        Bridge currentBridge = getBridge();
        if (sharedText.isEmpty() || currentBridge == null || currentBridge.getServerUrl() != null) {
            return;
        }

        WebView webView = currentBridge.getWebView();
        if (webView == null) {
            return;
        }

        // Build only a bundled-app URL. Shared links remain literal text; they
        // never select the destination or trigger external navigation/networking.
        String route = Uri.parse(currentBridge.getLocalUrl())
            .buildUpon()
            .path("/check")
            .clearQuery()
            .fragment(null)
            .appendQueryParameter("text", sharedText)
            .build()
            .toString();

        // Posting after bridge creation replaces its initial load safely;
        // singleTask warm shares follow the same navigation. The screen consumes and
        // clears the query immediately and waits for the user's Analyze action.
        webView.post(() -> {
            if (!isFinishing() && !isDestroyed()) {
                webView.loadUrl(route);
            }
        });
    }

    private Intent cleanLaunchIntent() {
        return new Intent(this, MainActivity.class).setAction(Intent.ACTION_MAIN);
    }

    private static boolean isShareIntent(Intent intent) {
        return intent != null && (
            Intent.ACTION_SEND.equals(intent.getAction()) ||
            Intent.ACTION_SEND_MULTIPLE.equals(intent.getAction())
        );
    }

    private static String readSharedText(Intent intent) {
        if (!Intent.ACTION_SEND.equals(intent.getAction()) || !"text/plain".equals(intent.getType())) {
            return "";
        }
        try {
            // Read EXTRA_TEXT only: no URI streams, HTML, attachment resolution,
            // clipboard reads, persisted files, or analysis/upload requests.
            return SharedText.boundedPlainText(intent.getCharSequenceExtra(Intent.EXTRA_TEXT));
        } catch (RuntimeException invalidExtra) {
            // An exported share target can receive malformed parcelled extras.
            // Ignore them without logging any of the sender's content.
            return "";
        }
    }
}
