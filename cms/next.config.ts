import { withPayload } from "@payloadcms/next/withPayload";

export default withPayload(
  {
    output: "standalone",
    // turbopack: {
    //   resolveExtensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.cjs', '.cts'],
    // },
    devIndicators: false, // disable nextjs dev-tools in admin page
    webpack: (webpackConfig: any, { isServer }: { isServer: boolean }) => {
      webpackConfig.resolve.extensionAlias = {
        ".cjs": [".cts", ".cjs"],
        ".js": [".ts", ".tsx", ".js", ".jsx"],
        ".mjs": [".mts", ".mjs"],
      };

      // Exclude node modules from client bundling
      if (!isServer) {
        webpackConfig.externals = webpackConfig.externals || [];
        webpackConfig.externals.push(
          // Exclude pg and related modules
          /^pg$/,
          /^pg-connection-string$/,
          /^pg-native$/,
          /^pg-protocol$/,
          /^pg-pool$/,
          /^pg-types$/,
          /^pgpass$/,
          // Exclude other problematic node modules
          /^fs$/,
          /^net$/,
          /^tls$/,
          /^dns$/,
          /^child_process$/,
          /^worker_threads$/,
          /^crypto$/,
        );
      }

      return webpackConfig;
    },
  },
  { devBundleServerPackages: false },
);
