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
        sha256_cert_fingerprints: ["A7:9F:14:E0:A8:55:CC:86:82:96:75:37:87:A6:4C:E5:AE:6D:DE:78:98:4F:4D:D9:EA:A0:4B:1D:6B:FC:17:FA"],
      },
    },
  ];

  return new NextResponse(JSON.stringify(assetlinks), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
