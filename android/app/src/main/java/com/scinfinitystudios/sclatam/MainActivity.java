package com.scinfinitystudios.sclatam;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView webView;

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
        });

        webView.setWebChromeClient(new WebChromeClient());
        webView.loadUrl("https://sc-latam-community.vercel.app/");
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
        if (isTikTok(uri)) {
            return openTikTok(uri);
        }
        if (isYouTube(uri)) {
            return openYouTube(uri);
        }
        if (isWhatsApp(uri)) {
            return openWhatsApp(uri);
        }
        return false;
    }

    private boolean openTikTok(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            return true;
        } catch (Exception ignored) {
            try {
                Intent fallback = new Intent(Intent.ACTION_VIEW, Uri.parse("https://www.tiktok.com/@sc.latamcommunity"));
                fallback.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(fallback);
            } catch (Exception ignoredAgain) { }
            return true;
        }
    }

    private boolean openYouTube(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.setPackage("com.google.android.youtube");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            return true;
        } catch (Exception ignored) {
            try {
                Uri fallback = Uri.parse("https://www.youtube.com/@SC.LATAMCommunity");
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, fallback);
                browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(browserIntent);
            } catch (Exception ignoredAgain) { }
            return true;
        }
    }

    private boolean openWhatsApp(Uri uri) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            intent.setPackage("com.whatsapp");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            startActivity(intent);
            return true;
        } catch (Exception ignored) {
            try {
                Uri fallback = Uri.parse("https://whatsapp.com/channel/0029VbDvqFuJUM2XckjfVR2r");
                Intent browserIntent = new Intent(Intent.ACTION_VIEW, fallback);
                browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                startActivity(browserIntent);
            } catch (Exception ignoredAgain) { }
            return true;
        }
    }

    @Override
    public void onBackPressed() {
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}
