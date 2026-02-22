import Foundation
import Capacitor

@objc(SiriIntentPlugin)
public class SiriIntentPlugin: CAPPlugin, CAPBridgedPlugin {

    public let identifier = "SiriIntentPlugin"
    public let jsName = "SiriIntent"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "syncAuthToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clearAuthToken", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hasAuthToken", returnType: CAPPluginReturnPromise),
    ]

    @objc func syncAuthToken(_ call: CAPPluginCall) {
        guard let accessToken = call.getString("accessToken"),
              let refreshToken = call.getString("refreshToken") else {
            call.reject("Missing accessToken or refreshToken")
            return
        }

        let userId = call.getString("userId") ?? ""

        let s1 = KeychainHelper.save(key: OnSiteConfig.keychainAccessToken, value: accessToken)
        let s2 = KeychainHelper.save(key: OnSiteConfig.keychainRefreshToken, value: refreshToken)

        if !userId.isEmpty {
            _ = KeychainHelper.save(key: OnSiteConfig.keychainUserId, value: userId)
        }

        if s1 && s2 {
            call.resolve(["success": true])
        } else {
            call.reject("Failed to save tokens to Keychain")
        }
    }

    @objc func clearAuthToken(_ call: CAPPluginCall) {
        KeychainHelper.delete(key: OnSiteConfig.keychainAccessToken)
        KeychainHelper.delete(key: OnSiteConfig.keychainRefreshToken)
        KeychainHelper.delete(key: OnSiteConfig.keychainUserId)
        call.resolve(["success": true])
    }

    @objc func hasAuthToken(_ call: CAPPluginCall) {
        let hasToken = KeychainHelper.read(key: OnSiteConfig.keychainAccessToken) != nil
        call.resolve(["hasToken": hasToken])
    }
}
