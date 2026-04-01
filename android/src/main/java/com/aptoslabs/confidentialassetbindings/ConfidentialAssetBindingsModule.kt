package com.aptoslabs.confidentialassetbindings

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class ConfidentialAssetBindingsModule : Module() {
  companion object {
    init {
      System.loadLibrary("aptos_confidential_asset_mobile")
    }
  }

  private external fun hello(): String
  override fun definition() = ModuleDefinition {
    Name("ConfidentialAssetBindings")

    Function("hello") {
      hello()
    }
  }
}
