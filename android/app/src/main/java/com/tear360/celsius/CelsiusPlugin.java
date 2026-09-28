package com.tear360.celsius;

import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

@CapacitorPlugin(name = "Celsius")
public class CelsiusPlugin extends Plugin {

    private final ExecutorService pool = Executors.newCachedThreadPool();
    private final Map<String, Future<?>> jobs = new ConcurrentHashMap<>();
    private final Map<String, HttpURLConnection> connections = new ConcurrentHashMap<>();

    /* --------------------------------------------------------- systeme */

    @PluginMethod
    public void systemInfo(PluginCall call) {
        JSObject res = new JSObject();
        res.put("model", Build.MODEL);
        res.put("manufacturer", Build.MANUFACTURER);
        res.put("sdk", Build.VERSION.SDK_INT);
        res.put("release", Build.VERSION.RELEASE);
        res.put("canInstallPackages", canRequestInstalls());
        call.resolve(res);
    }

    /* ------------------------------------------------------ telechargement */

    @PluginMethod
    public void download(PluginCall call) {
        String taskId = call.getString("taskId");
        String url = call.getString("url");
        String fileName = call.getString("fileName");
        boolean autoInstall = call.getBoolean("autoInstall", false);

        if (taskId == null || url == null || fileName == null) {
            call.reject("download: taskId, url et fileName sont obligatoires");
            return;
        }
        call.resolve();

        final String id = taskId;
        final String target = fileName;
        final boolean install = autoInstall;

        jobs.put(id, pool.submit(() -> runDownload(id, url, target, install)));
    }

    private void runDownload(String taskId, String url, String fileName, boolean install) {
        File dir = getContext().getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS);
        if (dir == null) {
            dir = new File(getContext().getFilesDir(), "downloads");
        }
        if (!dir.exists() && !dir.mkdirs()) {
            emitState(taskId, "error", "Impossible de creer le dossier de telechargement", null);
            return;
        }
        File out = new File(dir, fileName);

        HttpURLConnection conn = null;
        InputStream in = null;
        FileOutputStream fos = null;
        long total = 0;
        long received = 0;
        long startedAt = System.currentTimeMillis();
        long lastEmit = 0;

        try {
            int redirects = 0;
            String current = url;
            while (true) {
                conn = (HttpURLConnection) new URL(current).openConnection();
                conn.setInstanceFollowRedirects(false);
                conn.setConnectTimeout(30000);
                conn.setReadTimeout(60000);
                conn.setRequestProperty("User-Agent", "Celsius-Store");
                conn.connect();
                int code = conn.getResponseCode();
                if (code == HttpURLConnection.HTTP_MOVED_PERM
                        || code == HttpURLConnection.HTTP_MOVED_TEMP
                        || code == HttpURLConnection.HTTP_SEE_OTHER
                        || code == 307
                        || code == 308) {
                    String location = conn.getHeaderField("Location");
                    conn.disconnect();
                    if (location == null || redirects++ > 8) {
                        throw new IllegalStateException("Redirection impossible");
                    }
                    current = new URL(new URL(current), location).toString();
                    continue;
                }
                if (code < 200 || code >= 300) {
                    throw new IllegalStateException("HTTP " + code);
                }
                break;
            }

            connections.put(taskId, conn);
            total = conn.getContentLengthLong();
            in = conn.getInputStream();
            fos = new FileOutputStream(out);

            byte[] buffer = new byte[64 * 1024];
            int read;
            while ((read = in.read(buffer)) != -1) {
                fos.write(buffer, 0, read);
                received += read;
                long now = System.currentTimeMillis();
                if (now - lastEmit > 150) {
                    lastEmit = now;
                    JSObject data = new JSObject();
                    data.put("taskId", taskId);
                    data.put("received", received);
                    data.put("total", total);
                    data.put("percent", total > 0 ? (received * 100.0) / total : 0);
                    long elapsed = Math.max(1, now - startedAt);
                    data.put("speed", (received * 1000L) / elapsed);
                    notifyListeners("downloadProgress", data);
                }
            }
            fos.flush();
            fos.close();
            fos = null;
            in.close();
            in = null;

            JSObject last = new JSObject();
            last.put("taskId", taskId);
            last.put("received", received);
            last.put("total", total > 0 ? total : received);
            last.put("percent", 100);
            notifyListeners("downloadProgress", last);

            emitState(taskId, "downloaded", null, out.getAbsolutePath());

            if (install) {
                installApkFile(out, taskId);
            }
        } catch (Exception e) {
            if (out.exists()) {
                out.delete();
            }
            String message = e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
            if ("Annule".equals(message)) {
                emitState(taskId, "cancelled", null, null);
            } else {
                emitState(taskId, "error", message, null);
            }
        } finally {
            connections.remove(taskId);
            jobs.remove(taskId);
            try {
                if (fos != null) fos.close();
            } catch (Exception ignored) {
            }
            try {
                if (in != null) in.close();
            } catch (Exception ignored) {
            }
            if (conn != null) conn.disconnect();
        }
    }

    @PluginMethod
    public void cancelDownload(PluginCall call) {
        String taskId = call.getString("taskId");
        if (taskId == null) {
            call.reject("taskId manquant");
            return;
        }
        Future<?> job = jobs.remove(taskId);
        if (job != null) {
            job.cancel(true);
        }
        HttpURLConnection conn = connections.remove(taskId);
        if (conn != null) {
            conn.disconnect();
        }
        call.resolve();
    }

    /* ---------------------------------------------------------- installation */

    @PluginMethod
    public void installApk(PluginCall call) {
        String path = call.getString("path");
        String taskId = call.getString("taskId", "install");
        if (path == null) {
            call.reject("path manquant");
            return;
        }
        try {
            installApkFile(new File(path), taskId);
            call.resolve();
        } catch (Exception e) {
            call.reject(e.getMessage() == null ? "Installation impossible" : e.getMessage());
        }
    }

    private boolean canRequestInstalls() {
        return Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getContext().getPackageManager().canRequestPackageInstalls();
    }

    private void installApkFile(File apk, String taskId) {
        if (!canRequestInstalls()) {
            emitState(taskId, "needs-permission", "Autorise l'installation d'apps inconnues pour Celsius", null);
            openInstallPermissionSettings();
            return;
        }
        try {
            Uri uri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    apk
            );
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().getWindow().setStatusBarColor(0xFF070A16);
            getActivity().startActivity(intent);
            emitState(taskId, "awaiting-install", null, apk.getAbsolutePath());
        } catch (ActivityNotFoundException e) {
            emitState(taskId, "error", "Aucun installateur de paquets trouve sur cet appareil", null);
        }
    }

    private void openInstallPermissionSettings() {
        try {
            Intent intent = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES);
            intent.setData(Uri.parse("package:" + getContext().getPackageName()));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
        } catch (Exception e) {
            emitState("install-permission", "error", "Impossible d'ouvrir les reglages", null);
        }
    }

    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        openInstallPermissionSettings();
        call.resolve();
    }

    /* -------------------------------------------------------------- apps */

    @PluginMethod
    public void isPackageInstalled(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null) {
            call.reject("packageName manquant");
            return;
        }
        JSObject res = new JSObject();
        res.put("installed", isInstalled(packageName));
        res.put("version", installedVersion(packageName));
        call.resolve(res);
    }

    private boolean isInstalled(String packageName) {
        try {
            getContext().getPackageManager().getApplicationInfo(packageName, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        }
    }

    private String installedVersion(String packageName) {
        try {
            ApplicationInfo info = getContext().getPackageManager().getApplicationInfo(packageName, 0);
            return getContext().getPackageManager()
                    .getPackageInfo(packageName, 0).versionName;
        } catch (Exception e) {
            return null;
        }
    }

    @PluginMethod
    public void launchPackage(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null) {
            call.reject("packageName manquant");
            return;
        }
        if (!isInstalled(packageName)) {
            call.reject("Cette application n'est pas installee sur cet appareil");
            return;
        }
        Intent intent = getContext().getPackageManager()
                .getLaunchIntentForPackage(packageName);
        if (intent == null) {
            call.reject("Impossible de lancer " + packageName);
            return;
        }
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getActivity().startActivity(intent);
        call.resolve();
    }

    @PluginMethod
    public void uninstallPackage(PluginCall call) {
        String packageName = call.getString("packageName");
        if (packageName == null) {
            call.reject("packageName manquant");
            return;
        }
        try {
            Intent intent = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
            intent.setData(Uri.parse("package:" + packageName));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Impossible d'ouvrir les reglages de l'application");
        }
    }

    @PluginMethod
    public void openExternal(PluginCall call) {
        String url = call.getString("url");
        if (url == null) {
            call.reject("url manquant");
            return;
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getActivity().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Aucune application ne peut ouvrir cette adresse");
        }
    }

    @PluginMethod
    public void listInstalled(PluginCall call) {
        JSArray out = new JSArray();
        try {
            for (ApplicationInfo info : getContext().getPackageManager().getInstalledApplications(0)) {
                JSObject item = new JSObject();
                item.put("packageName", info.packageName);
                item.put("label", String.valueOf(getContext().getPackageManager().getApplicationLabel(info)));
                out.put(item);
            }
        } catch (Exception ignored) {
        }
        JSObject res = new JSObject();
        res.put("apps", out);
        call.resolve(res);
    }

    /* ------------------------------------------------------------- util */

    private void emitState(String taskId, String phase, String error, String path) {
        JSObject data = new JSObject();
        data.put("taskId", taskId);
        data.put("phase", phase);
        if (error != null) {
            data.put("error", error);
        }
        if (path != null) {
            data.put("path", path);
        }
        notifyListeners("taskState", data);
    }

    @Override
    protected void handleOnDestroy() {
        for (Future<?> job : jobs.values()) {
            job.cancel(true);
        }
        jobs.clear();
        pool.shutdownNow();
        super.handleOnDestroy();
    }
}
