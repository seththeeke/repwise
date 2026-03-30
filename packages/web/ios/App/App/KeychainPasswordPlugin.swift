import Capacitor
import Foundation
import Security

/// Requests shared web credentials for the app’s associated domain (Face ID / Touch ID unlocks Keychain).
@objc(KeychainPasswordPlugin)
public class KeychainPasswordPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "KeychainPasswordPlugin"
    public let jsName = "KeychainPasswordPlugin"
    public let pluginMethods: [CAPPluginMethod] = [
        .init(#selector(requestSharedWebCredential))
    ]

    @objc func requestSharedWebCredential(_ call: CAPPluginCall) {
        let domain = call.getString("domain")
        let domainCF: CFString? = domain.map { $0 as CFString }
        SecRequestSharedWebCredential(domainCF, nil) { credentials, error in
            DispatchQueue.main.async {
                if let error = error {
                    call.reject(error.localizedDescription, "KEYCHAIN_ERROR")
                    return
                }
                guard let credentials = credentials, CFArrayGetCount(credentials) > 0 else {
                    call.reject("No saved password for this site", "NO_CREDENTIALS")
                    return
                }
                guard let dict = (credentials as NSArray).firstObject as? NSDictionary else {
                    call.reject("No saved password for this site", "NO_CREDENTIALS")
                    return
                }
                let username = dict.object(forKey: kSecAttrAccount) as? String
                let password = dict.object(forKey: kSecSharedPassword) as? String
                guard let username, let password else {
                    call.reject("No saved password for this site", "NO_CREDENTIALS")
                    return
                }
                call.resolve([
                    "username": username,
                    "password": password
                ])
            }
        }
    }
}
