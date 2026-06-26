package com.nps.pwa.studio;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebChromeClient;

public class MainActivity extends Activity {
    private WebView webView;

    @SuppressLint({"SetJavaScriptEnabled","AddJavascriptInterface"})
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
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

        // Interface JavaScript → Android pour ouvrir liens externes dans le navigateur
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                String url = request.getUrl().toString();
                if (url.startsWith("file://")) {
                    return false; // charger dans WebView
                }
                // Ouvrir les liens http/https dans le navigateur externe
                Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                try { startActivity(intent); } catch (Exception e) { /* ignore */ }
                return true;
            }
        });
        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl("file:///android_asset/www/index.html");
    }

    // Classe bridge pour appels JS -> Android
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
