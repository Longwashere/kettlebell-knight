package com.kettlebellknight.tv;

import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebSettings;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Reps arrive from the phone, not the remote: keep the Fire TV screensaver from covering a workout.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        // Honour the page's <meta viewport> width (set to 1920 by installTvViewport in src/tv/native.ts) and zoom
        // it to fit. Otherwise Fire TV's 2x density lays the UI out at 960x540 and every overlay renders twice as big.
        WebSettings settings = getBridge().getWebView().getSettings();
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);
    }
}
