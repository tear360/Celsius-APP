package com.tear360.celsius;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CelsiusPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
