package com.nps.pwa.studio;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.Manifest;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;

    @SuppressLint({"SetJavaScriptEnabled","AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // ── Demande d'accès aux fichiers externes ──
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (!Environment.isExternalStorageManager()) {
                try {
                    Intent intent = new Intent(Settings.ACTION_MANAGE_APP_ALL_FILES_ACCESS_PERMISSION);
                    intent.setData(Uri.parse("package:" + getPackageName()));
                    startActivity(intent);
                } catch (Exception e) {
                    try {
                        Intent intent = new Intent(Settings.ACTION_MANAGE_ALL_FILES_ACCESS_PERMISSION);
                        startActivity(intent);
                    } catch (Exception ignored) {}
                }
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            requestPermissions(new String[]{
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            }, 1);
        }

        webView = new WebView(this);
        setContentView(webView);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        s.setBuiltInZoomControls(false);
        s.setSupportZoom(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMediaPlaybackRequiresUserGesture(false);

        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("file://")) return false;
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try { startActivity(intent); } catch (Exception e) { /* ignore */ }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    public class AndroidBridge {
        @JavascriptInterface
        public void openUrl(String url) {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { startActivity(intent); } catch (Exception e) { /* ignore */ }
        }
        @JavascriptInterface
        public void share(String text) {
            Intent intent = new Intent(Intent.ACTION_SEND);
            intent.setType("text/plain");
            intent.putExtra(Intent.EXTRA_TEXT, text);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try { startActivity(Intent.createChooser(intent, "Partager")); } catch (Exception e) { /* ignore */ }
        }
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
            return;
        }
        webView.evaluateJavascript(
            "(function(){ try{ return localStorage.getItem('nps_quit_confirm'); }catch(e){ return null; } })()",
            value -> {
                boolean showConfirm = !"\"0\"".equals(value);
                if (showConfirm) {
                    new AlertDialog.Builder(MainActivity.this)
                        .setTitle("Quitter l'application")
                        .setMessage("Voulez-vous vraiment quitter PWA-APK Studio ?")
                        .setPositiveButton("Quitter", (d, w) -> finish())
                        .setNegativeButton("Annuler", null)
                        .show();
                } else {
                    finish();
                }
            }
        );
    }
}
