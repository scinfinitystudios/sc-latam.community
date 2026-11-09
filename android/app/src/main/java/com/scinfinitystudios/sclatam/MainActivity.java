package com.scinfinitystudios.sclatam;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private static final String HOME_URL = "https://sc-latam-community.vercel.app/";
    private static final String ACCOUNT_URL = "https://sc-latam-community.vercel.app/cuenta.html";
    private WebView webView;
    private Uri pendingAuthCallback;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        webView = new WebView(this);
        setContentView(webView);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        webView.addJavascriptInterface(new AndroidAuthBridge(), "AndroidAuth");
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return openExternal(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                return openExternal(Uri.parse(url));
            }

            @Override
            public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
                Uri uri = Uri.parse(url);
                if (isTikTok(uri) || isYouTube(uri) || isWhatsApp(uri)) {
                    view.stopLoading();
                    openExternal(uri);
                    return;
                }
                super.onPageStarted(view, url, favicon);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                if (pendingAuthCallback != null) {
                    Uri callback = pendingAuthCallback;
                    pendingAuthCallback = null;
                    deliverAuthCallback(callback);
                }
            }
        });

        webView.setWebChromeClient(new WebChromeClient());
        handleAuthCallback(getIntent());
        webView.loadUrl(HOME_URL);
    }

    private final class AndroidAuthBridge {
        @JavascriptInterface
        public void openAuthUrl(String rawUrl) {
            runOnUiThread(() -> {
                Uri uri = Uri.parse(rawUrl == null ? "" : rawUrl);
                if (!isTrustedSupabaseAuthorizeUrl(uri)) return;
                try {
                    startActivity(new Intent(Intent.ACTION_VIEW, uri));
                } catch (Exception ignored) { }
            });
        }
    }

    private boolean isTrustedSupabaseAuthorizeUrl(Uri uri) {
        String scheme = uri.getScheme();
        String host = uri.getHost();
        return "https".equalsIgnoreCase(scheme)
                && host != null
                && host.toLowerCase().endsWith(".supabase.co")
                && "/auth/v1/authorize".equals(uri.getPath());
    }

    private void handleAuthCallback(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        Uri uri = intent.getData();
        if ("sclatam".equalsIgnoreCase(uri.getScheme())
                && "auth".equalsIgnoreCase(uri.getHost())
                && "/callback".equals(uri.getPath())) {
            pendingAuthCallback = uri;
        }
    }

    private void deliverAuthCallback(Uri callback) {
        if (webView == null) return;
        StringBuilder target = new StringBuilder(ACCOUNT_URL);
        if (callback.getEncodedQuery() != null) target.append("?").append(callback.getEncodedQuery());
        if (callback.getEncodedFragment() != null) target.append("#").append(callback.getEncodedFragment());
        webView.loadUrl(target.toString());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleAuthCallback(intent);
        if (pendingAuthCallback != null && webView != null) {
            Uri callback = pendingAuthCallback;
            pendingAuthCallback = null;
            deliverAuthCallback(callback);
        }
    }

    private boolean isTikTok(Uri uri) {
        String scheme = uri.getScheme();
        String host = uri.getHost();
        return "snssdk1233".equalsIgnoreCase(scheme)
                || (host != null && ("tiktok.com".equalsIgnoreCase(host)
                || host.toLowerCase().endsWith(".tiktok.com")));
    }

    private boolean isYouTube(Uri uri) {
        String scheme = uri.getScheme();
        String host = uri.getHost();
        return "vnd.youtube".equalsIgnoreCase(scheme)
                || "youtube".equalsIgnoreCase(scheme)
                || (host != null && ("youtube.com".equalsIgnoreCase(host)
                || host.toLowerCase().endsWith(".youtube.com")
                || "youtu.be".equalsIgnoreCase(host)));
    }

    private boolean isWhatsApp(Uri uri) {
        String scheme = uri.getScheme();
        String host = uri.getHost();
        return "whatsapp".equalsIgnoreCase(scheme)
                || (host != null && ("whatsapp.com".equalsIgnoreCase(host)
                || host.toLowerCase().endsWith(".whatsapp.com")));
    }

    private boolean openExternal(Uri uri) {
        if (isTikTok(uri)) return openTikTok(uri);
        if (isYouTube(uri)) return openYouTube(uri);
        if (isWhatsApp(uri)) return openWhatsApp(uri);
        return false;
    }

    private boolean openTikTok(Uri uri) {
        try {
            startActivity(new Intent(Intent.ACTION_VIEW, uri));
            return true;
        } catch (Exception ignored) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.tiktok.com/@sc.latamcommunity")));
            } catch (Exception ignoredAgain) { }
            return true;
        }
    }

    private boolean openYouTube(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.setPackage("com.google.android.youtube");
            startActivity(intent);
            return true;
        } catch (Exception ignored) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.youtube.com/@SC.LATAMCommunity")));
            } catch (Exception ignoredAgain) { }
            return true;
        }
    }

    private boolean openWhatsApp(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.setPackage("com.whatsapp");
            startActivity(intent);
            return true;
        } catch (Exception ignored) {
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse("https://whatsapp.com/channel/0029VbDvqFuJUM2XckjfVR2r")));
            } catch (Exception ignoredAgain) { }
            return true;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) webView.goBack();
        else super.onBackPressed();
    }
}
