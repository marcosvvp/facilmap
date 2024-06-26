import { setConfig, type InjectedConfig } from "facilmap-utils";

const config: InjectedConfig = JSON.parse(document.querySelector("meta[name=fmConfig]")!.getAttribute("content")!);

setConfig({
	nominatimUrl: config.nominatimUrl,
	openElevationApiUrl: config.openElevationApiUrl,
	openElevationThrottleMs: config.openElevationThrottleMs,
	openElevationMaxBatchSize: config.openElevationMaxBatchSize
});

export default config;
