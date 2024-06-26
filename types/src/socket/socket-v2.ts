import { idValidator, type MapId, type ReplaceProperties } from "../base.js";
import { markerValidator } from "../marker.js";
import { refineRawTypeValidator, rawTypeValidator, fieldOptionValidator, refineRawFieldOptionsValidator, fieldValidator, refineRawFieldsValidator, defaultFields } from "../type.js";
import type { MultipleEvents } from "../events.js";
import { renameProperty, type FindOnMapMarker, type FindOnMapResult, type RenameProperty, type ReplaceProperty } from "./socket-common.js";
import { requestDataValidatorsV3, type MapEventsV3, type ResponseDataMapV3 } from "./socket-v3.js";
import type { CRU, CRUType } from "../cru.js";
import * as z from "zod";
import type { GenericHistoryEntry, HistoryEntryObjectTypes } from "../historyEntry.js";
import { omit } from "lodash-es";
import { lineValidator } from "../line.js";
import { viewValidator } from "../view.js";

// Socket v2:
// - “icon” is called “symbol” in `Marker.symbol`, `Type.defaultSymbol`, `Type.symbolFixed`, `Type.fields[].controlSymbol` and
//   `Type.fields[].options[].symbol`.
// - “map” is called “pad” in events, types, methods
// - "MapNotFoundError" is called "PadNotFoundError"

export const legacyV2MarkerValidator = {
	read: markerValidator.read.omit({ icon: true, mapId: true }).extend({ symbol: markerValidator.read.shape.icon, padId: markerValidator.read.shape.mapId }),
	create: markerValidator.create.omit({ icon: true }).extend({ symbol: markerValidator.create.shape.icon }),
	update: markerValidator.update.omit({ icon: true }).extend({ symbol: markerValidator.update.shape.icon })
};
export type LegacyV2Marker<Mode extends CRU = CRU.READ> = CRUType<Mode, typeof legacyV2MarkerValidator>;

export const legacyV2LineValidator = {
	read: lineValidator.read.omit({ mapId: true }).extend({ padId: lineValidator.read.shape.mapId }),
	create: lineValidator.create,
	update: lineValidator.update
};
export type LegacyV2Line<Mode extends CRU = CRU.READ> = CRUType<Mode, typeof legacyV2LineValidator>;

export const legacyV2FieldOptionsValidator = refineRawFieldOptionsValidator({
	read: z.array(fieldOptionValidator.read.omit({ icon: true }).extend({ symbol: fieldOptionValidator.read.shape.icon })),
	create: z.array(fieldOptionValidator.create.omit({ icon: true }).extend({ symbol: fieldOptionValidator.create.shape.icon })),
	update: z.array(fieldOptionValidator.update.omit({ icon: true }).extend({ symbol: fieldOptionValidator.update.shape.icon }))
});

export const legacyV2FieldsValidator = refineRawFieldsValidator({
	read: z.array(fieldValidator.read.omit({ controlIcon: true, options: true }).extend({
		controlSymbol: fieldValidator.read.shape.controlIcon,
		options: legacyV2FieldOptionsValidator.read.optional()
	})),
	create: z.array(fieldValidator.create.omit({ controlIcon: true, options: true }).extend({
		controlSymbol: fieldValidator.create.shape.controlIcon,
		options: legacyV2FieldOptionsValidator.create.optional()
	})),
	update: z.array(fieldValidator.update.omit({ controlIcon: true, options: true }).extend({
		controlSymbol: fieldValidator.update.shape.controlIcon,
		options: legacyV2FieldOptionsValidator.update.optional()
	}))
});

export const legacyV2TypeValidator = refineRawTypeValidator({
	read: rawTypeValidator.read.omit({ defaultIcon: true, iconFixed: true, fields: true, mapId: true }).extend({
		defaultSymbol: rawTypeValidator.read.shape.defaultIcon,
		symbolFixed: rawTypeValidator.read.shape.iconFixed,
		fields: legacyV2FieldsValidator.read,
		padId: rawTypeValidator.read.shape.mapId
	}),
	create: rawTypeValidator.create.omit({ defaultIcon: true, iconFixed: true }).extend({
		defaultSymbol: rawTypeValidator.create.shape.defaultIcon,
		symbolFixed: rawTypeValidator.create.shape.iconFixed,
		fields: legacyV2FieldsValidator.create.default(defaultFields)
	}),
	update: rawTypeValidator.update.omit({ defaultIcon: true, iconFixed: true }).extend({
		defaultSymbol: rawTypeValidator.update.shape.defaultIcon,
		symbolFixed: rawTypeValidator.update.shape.iconFixed,
		fields: legacyV2FieldsValidator.update
	})
});
export type LegacyV2Type<Mode extends CRU = CRU.READ> = CRUType<Mode, typeof legacyV2TypeValidator>;

export const legacyV2ViewValidator = {
	read: viewValidator.read.omit({ mapId: true }).extend({ padId: viewValidator.read.shape.mapId }),
	create: viewValidator.create,
	update: viewValidator.update
};
export type LegacyV2View<Mode extends CRU = CRU.READ> = CRUType<Mode, typeof legacyV2ViewValidator>;

export type LegacyV2FindOnMapMarker = RenameProperty<FindOnMapMarker, "icon", "symbol", false>;
export type LegacyV2FindOnMapResult = LegacyV2FindOnMapMarker | Exclude<FindOnMapResult, FindOnMapMarker>;

export type LegacyV2HistoryEntry = Omit<GenericHistoryEntry<ReplaceProperties<HistoryEntryObjectTypes, {
	Marker: Omit<LegacyV2Marker, "id">;
	Line: Omit<LegacyV2Line, "id">;
	Type: Omit<LegacyV2Type, "id">;
	View: Omit<LegacyV2View, "id">;
}>>, "mapId"> & {
	padId: MapId;
};

export const legacyV2GetMapQueryValidator = z.object({
	padId: z.string()
});

export const requestDataValidatorsV2 = {
	...omit(requestDataValidatorsV3, ["getMap", "findMaps", "createMap", "editMap", "deleteMap", "setMapId"]),
	getPad: legacyV2GetMapQueryValidator,
	findPads: requestDataValidatorsV3.findMaps,
	createPad: requestDataValidatorsV3.createMap,
	editPad: requestDataValidatorsV3.editMap,
	deletePad: requestDataValidatorsV3.deleteMap,
	setPadId: requestDataValidatorsV3.setMapId,
	addMarker: legacyV2MarkerValidator.create,
	editMarker: legacyV2MarkerValidator.update.extend({ id: idValidator }),
	addType: legacyV2TypeValidator.create,
	editType: legacyV2TypeValidator.update.extend({ id: idValidator })
};

export type ResponseDataMapV2 = ReplaceProperties<Omit<ResponseDataMapV3, "getMap" | "findMaps" | "createMap" | "editMap" | "deleteMap" | "setMapId">, {
	getPad: ResponseDataMapV3["getMap"];
	findPads: ResponseDataMapV3["findMaps"];
	editPad: ResponseDataMapV3["editMap"];
	deletePad: ResponseDataMapV3["deleteMap"];
	updateBbox: MultipleEvents<MapEventsV2>;
	createPad: MultipleEvents<MapEventsV2>;
	listenToHistory: MultipleEvents<MapEventsV2>;
	revertHistoryEntry: MultipleEvents<MapEventsV2>;
	getMarker: LegacyV2Marker;
	addMarker: LegacyV2Marker;
	editMarker: LegacyV2Marker;
	deleteMarker: LegacyV2Marker;
	addLine: LegacyV2Line;
	editLine: LegacyV2Line;
	deleteLine: LegacyV2Line;
	findOnMap: Array<LegacyV2FindOnMapResult>;
	addType: LegacyV2Type;
	editType: LegacyV2Type;
	deleteType: LegacyV2Type;
	addView: LegacyV2View;
	editView: LegacyV2View;
	deleteView: LegacyV2View;
	setPadId: MultipleEvents<MapEventsV2>;
}>;

export type MapEventsV2 = ReplaceProperties<Omit<MapEventsV3, "mapData" | "deleteMap">, {
	marker: [LegacyV2Marker];
	line: [LegacyV2Line];
	type: [LegacyV2Type];
	view: [LegacyV2View];
	history: [LegacyV2HistoryEntry];
	padData: MapEventsV3["mapData"];
	deletePad: MapEventsV3["deleteMap"];
}>;

export function legacyV2MarkerToCurrent<M extends Record<keyof any, any>, KeepOld extends boolean = false>(marker: M, keepOld?: KeepOld): RenameProperty<M, "symbol", "icon", KeepOld> {
	return renameProperty(marker, "symbol", "icon", keepOld);
}

export function currentMarkerToLegacyV2<M extends Record<keyof any, any>, KeepOld extends boolean = false>(marker: M, keepOld?: KeepOld): RenameProperty<RenameProperty<M, "icon", "symbol", KeepOld>, "mapId", "padId", KeepOld> {
	return renameProperty(renameProperty(marker, "icon", "symbol", keepOld), "mapId", "padId", keepOld);
}

export function currentLineToLegacyV2<L extends Record<keyof any, any>, KeepOld extends boolean = false>(line: L, keepOld?: KeepOld): RenameProperty<L, "mapId", "padId", KeepOld> {
	return renameProperty(line, "mapId", "padId", keepOld);
}

type RenameNestedArrayProperty<T, Key extends keyof any, From extends keyof any, To extends keyof any, KeepOld extends boolean = false> = (
	T extends Record<Key, Array<Record<From, any>>>
		? ReplaceProperty<T, Key, Array<RenameProperty<T[Key][number], From, To, KeepOld>>>
		: T
);
type RenameNestedNestedArrayProperty<T, Key1 extends keyof any, Key2 extends keyof any, From extends keyof any, To extends keyof any, KeepOld extends boolean = false> = (
	T extends Record<Key1, Array<Record<Key2, Array<Record<From, any>>>>>
		? ReplaceProperty<T, Key1, Array<ReplaceProperty<T[Key1][number], Key2, RenameProperty<T[Key1][number][Key2][number], From, To, KeepOld>>>>
		: T
);
type RenameTypeProperties<
	T,
	MapIdKeyOld extends keyof any,
	MapIdKeyNew extends keyof any,
	DefaultIconKeyOld extends keyof any,
	DefaultIconKeyNew extends keyof any,
	IconFixedKeyOld extends keyof any,
	IconFixedKeyNew extends keyof any,
	ControlIconKeyOld extends keyof any,
	ControlIconKeyNew extends keyof any,
	OptionIconKeyOld extends keyof any,
	OptionIconKeyNew extends keyof any,
	KeepOld extends boolean = false
> = RenameNestedNestedArrayProperty<
	RenameNestedArrayProperty<
		RenameProperty<
			RenameProperty<
				RenameProperty<T, MapIdKeyOld, MapIdKeyNew, KeepOld>,
			DefaultIconKeyOld, DefaultIconKeyNew, KeepOld>,
			IconFixedKeyOld, IconFixedKeyNew, KeepOld
		>, "fields", ControlIconKeyOld, ControlIconKeyNew, KeepOld
	>, "fields", "options", OptionIconKeyOld, OptionIconKeyNew, KeepOld
>;

export function legacyV2TypeToCurrent<T extends Record<keyof any, any>, KeepOld extends boolean = false>(type: T, keepOld?: KeepOld): RenameTypeProperties<T, "padId", "mapId", "defaultSymbol", "defaultIcon", "symbolFixed", "iconFixed", "controlSymbol", "controlIcon", "symbol", "icon", KeepOld> {
	const renamedType = renameProperty(renameProperty(renameProperty(type, "defaultSymbol", "defaultIcon", keepOld), "symbolFixed", "iconFixed", keepOld), "padId", "mapId", keepOld) as any;

	if (renamedType.fields && Array.isArray(renamedType.fields)) {
		renamedType.fields = renamedType.fields.map((field: any) => {
			const renamedField = renameProperty(field, "controlSymbol", "controlIcon", keepOld);
			if (Array.isArray(renamedField?.options)) {
				renamedField.options = renamedField.options.map((option: any) => renameProperty(option, "symbol", "icon", keepOld));
			}
			return renamedField;
		});
	}

	return renamedType;
}

export function currentTypeToLegacyV2<T extends Record<keyof any, any>, KeepOld extends boolean = false>(type: T, keepOld?: KeepOld): RenameTypeProperties<T, "mapId", "padId", "defaultIcon", "defaultSymbol", "iconFixed", "symbolFixed", "controlIcon", "controlSymbol", "icon", "symbol", KeepOld> {
	const renamedType = renameProperty(renameProperty(renameProperty(type, "defaultIcon", "defaultSymbol", keepOld), "iconFixed", "symbolFixed", keepOld), "mapId", "padId", keepOld) as any;

	if (renamedType.fields && Array.isArray(renamedType.fields)) {
		renamedType.fields = renamedType.fields.map((field: any) => {
			const renamedField = renameProperty(field, "controlIcon", "controlSymbol", keepOld);
			if (Array.isArray(renamedField?.options)) {
				renamedField.options = renamedField.options.map((option: any) => renameProperty(option, "icon", "symbol", keepOld));
			}
			return renamedField;
		});
	}

	return renamedType;
}

export function currentViewToLegacyV2<V extends Record<keyof any, any>, KeepOld extends boolean = false>(view: V, keepOld?: KeepOld): RenameProperty<V, "mapId", "padId", KeepOld> {
	return renameProperty(view, "mapId", "padId", keepOld);
}

export function currentHistoryEntryToLegacyV2<H extends Record<keyof any, any>>(historyEntry: H): RenameProperty<H, "mapId", "padId"> {
	return renameProperty(historyEntry, "mapId", "padId");
}