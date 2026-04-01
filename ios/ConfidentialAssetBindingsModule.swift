import ExpoModulesCore

public class ConfidentialAssetBindingsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("ConfidentialAssetBindings")

    Function("hello") {
      let ptr = confidential_asset_hello()!
      let result = String(cString: ptr)
      confidential_asset_free_string(UnsafeMutablePointer(mutating: ptr))
      return result
    }
  }
}
