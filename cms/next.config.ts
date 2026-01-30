import { withPayload } from "@payloadcms/next/withPayload";

export default withPayload(
  {
    output: "standalone",
    // turbopack: {
    //   resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.cjs', '.cts'],
    // },
    devIndicators: false, // disable nextjs dev-tools in admin page
    // webpack: (webpackConfig: any) => {
    //   webpackConfig.resolve.extensionAlias = {
    //     ".cjs": [".cts", ".cjs"],
    //     ".js": [".ts", ".tsx", ".js", ".jsx"],
    //     ".mjs": [".mts", ".mjs"],
    //   };
    //   return webpackConfig;
    // },
  },
  { devBundleServerPackages: false },
);
