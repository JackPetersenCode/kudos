import { NextResponse } from "next/server";

// Android App Links: served at https://reputater.com/.well-known/assetlinks.json
// Replace REPLACE_WITH_SHA256 with the SHA256 cert fingerprint from EAS:
//   eas credentials --platform android
// or from your release keystore: keytool -list -v -keystore <your.keystore>
export function GET() {
  const assetlinks = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.reputater.app",
        sha256_cert_fingerprints: ["REPLACE_WITH_SHA256_FROM_EAS_CREDENTIALS"],
      },
    },
  ];

  return new NextResponse(JSON.stringify(assetlinks), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
