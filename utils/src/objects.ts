import type { CRU, Field, FieldOption, Line, Marker, Type } from "facilmap-types";

export function isMarker<Mode extends CRU.READ | CRU.CREATE>(object: Marker<Mode> | Line<Mode>): object is Marker<Mode> {
	return "lat" in object && object.lat != null;
}

export function isLine<Mode extends CRU.READ | CRU.CREATE>(object: Marker<Mode> | Line<Mode>): object is Line<Mode> {
	return "routePoints" in object && object.routePoints != null;
}

export function canControl<T extends Marker | Line = Marker | Line>(type: Type<CRU.READ | CRU.CREATE_VALIDATED>, ignoreField?: Field | null): Array<T extends any ? keyof T : never /* https://stackoverflow.com/a/62085569/242365 */> {
	const props: string[] = type.type == "marker" ? ["colour", "size", "symbol", "shape"] : type.type == "line" ? ["colour", "width", "stroke", "mode"] : [];
	return props.filter((prop) => {
		if((type as any)[prop+"Fixed"] && ignoreField !== null)
			return false;

		const idx = "control"+prop.charAt(0).toUpperCase() + prop.slice(1);
		for (const field of type.fields ?? []) {
			if ((field as any)[idx] && (!ignoreField || field !== ignoreField))
				return false;
		}
		return true;
	}) as Array<T extends any ? keyof T : never>;
}

export function getSelectedOption(field: Field, value: string | undefined, ignoreDefault = false): FieldOption | undefined {
	const get = (val: string) => {
		if (field.type === "dropdown") {
			return field.options?.find((option) => option.value == val);
		} else if (field.type === "checkbox") {
			return field.options?.[Number(val)];
		}
	};

	return (value != null && get(value)) || (!ignoreDefault && field.default != null && get(field.default)) || field.options?.[0];
}

export function normalizeFieldValue(field: Field, value: string | undefined, ignoreDefault = false): string {
	if (field.type === "dropdown") {
		return getSelectedOption(field, value, ignoreDefault)?.value ?? "";
	} else if (field.type === "checkbox") {
		return value === "1" ? "1" : "0";
	} else {
		return value ?? "";
	}
}

export function applyMarkerStyles(marker: Marker, type: Type): Omit<Marker<CRU.UPDATE_VALIDATED>, "id"> {
	const update: Omit<Marker<CRU.UPDATE_VALIDATED>, "id"> = {};

	if(type.colourFixed && marker.colour != type.defaultColour)
		update.colour = type.defaultColour;
	if(type.sizeFixed && marker.size != type.defaultSize)
		update.size = type.defaultSize;
	if(type.symbolFixed && marker.symbol != type.defaultSymbol)
		update.symbol = type.defaultSymbol;
	if(type.shapeFixed && marker.shape != type.defaultShape)
		update.shape = type.defaultShape;

	for(const field of type.fields) {
		if(field.controlColour || field.controlSize || field.controlSymbol || field.controlShape) {
			const option = getSelectedOption(field, marker.data[field.name]);

			if(option) {
				if(field.controlColour && marker.colour != (option.colour ?? type.defaultColour))
					update.colour = option.colour ?? type.defaultColour;
				if(field.controlSize && marker.size != (option.size ?? type.defaultSize))
					update.size = option.size ?? type.defaultSize;
				if(field.controlSymbol && marker.symbol != (option.symbol ?? type.defaultSymbol))
					update.symbol = option.symbol ?? type.defaultSymbol;
				if(field.controlShape && marker.shape != (option.shape ?? type.defaultShape))
					update.shape = option.shape ?? type.defaultShape;
			}
		}
	}

	return update;
}

export function applyLineStyles(line: Line, type: Type): Omit<Marker<CRU.UPDATE_VALIDATED>, "id"> {
	const update: Omit<Line<CRU.UPDATE_VALIDATED>, "id"> = {};

	if(type.colourFixed && line.colour != type.defaultColour) {
		update.colour = type.defaultColour;
	}
	if(type.widthFixed && line.width != type.defaultWidth) {
		update.width = type.defaultWidth;
	}
	if (type.strokeFixed && line.stroke !== type.defaultStroke) {
		update.stroke = type.defaultStroke;
	}
	if(type.modeFixed && line.mode != type.defaultMode) {
		update.mode = type.defaultMode;
	}

	for(const field of type.fields) {
		if(field.controlColour || field.controlWidth || field.controlStroke) {
			const option = getSelectedOption(field, line.data[field.name]);

			if(option) {
				if(field.controlColour && line.colour != (option.colour ?? type.defaultColour)) {
					update.colour = option.colour ?? type.defaultColour;
				}
				if(field.controlWidth && line.width != (option.width ?? type.defaultWidth)) {
					update.width = option.width ?? type.defaultWidth;
				}
				if (field.controlStroke && line.stroke !== (option.stroke ?? type.defaultStroke)) {
					update.stroke = option.stroke ?? type.defaultStroke;
				}
			}
		}
	}

	return update;
}
