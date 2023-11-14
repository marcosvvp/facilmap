import { type CreationOptional, DataTypes, type ForeignKey, type InferAttributes, type InferCreationAttributes, Model } from "sequelize";
import type { BboxWithZoom, CRU, ID, Latitude, Longitude, Marker, PadId } from "facilmap-types";
import { type BboxWithExcept, createModel, dataDefinition, type DataModel, getDefaultIdType, getPosType, getVirtualLatType, getVirtualLonType, makeBboxCondition, makeNotNullForeignKey } from "./helpers.js";
import Database from "./database.js";
import { getElevationForPoint } from "../elevation.js";
import type { PadModel } from "./pad.js";
import type { Point as GeoJsonPoint } from "geojson";
import type { TypeModel } from "./type.js";

export interface MarkerModel extends Model<InferAttributes<MarkerModel>, InferCreationAttributes<MarkerModel>> {
	id: CreationOptional<ID>;
	padId: ForeignKey<PadModel["id"]>;
	pos: GeoJsonPoint;
	lat: Latitude;
	lon: Longitude;
	name: string;
	typeId: ForeignKey<TypeModel["id"]>;
	colour: string;
	size: number;
	symbol: string;
	shape: string;
	ele: number | null;
	toJSON: () => Marker;
}

export default class DatabaseMarkers {

	MarkerModel = createModel<MarkerModel>();
	MarkerDataModel = createModel<DataModel>();

	_db: Database;

	constructor(database: Database) {
		this._db = database;

		this.MarkerModel.init({
			id: getDefaultIdType(),
			lat: getVirtualLatType(),
			lon: getVirtualLonType(),
			pos: getPosType(),
			name : { type: DataTypes.TEXT, allowNull: false },
			colour : { type: DataTypes.STRING(6), allowNull: false },
			size : { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
			symbol : { type: DataTypes.TEXT, allowNull: false },
			shape : { type: DataTypes.TEXT, allowNull: false },
			ele: { type: DataTypes.INTEGER, allowNull: true }
		}, {
			sequelize: this._db._conn,
			// pos index is created in migration
			modelName: "Marker"
		});

		this.MarkerDataModel.init(dataDefinition, {
			sequelize: this._db._conn,
			modelName: "MarkerData"
		});
	}

	afterInit(): void {
		const PadModel = this._db.pads.PadModel;
		const TypeModel = this._db.types.TypeModel;

		PadModel.hasMany(this.MarkerModel, makeNotNullForeignKey("Markers", "padId"));
		this.MarkerModel.belongsTo(PadModel, makeNotNullForeignKey("pad", "padId"));
		this.MarkerModel.belongsTo(TypeModel, makeNotNullForeignKey("type", "typeId", true));

		this.MarkerDataModel.belongsTo(this.MarkerModel, makeNotNullForeignKey("marker", "markerId"));
		this.MarkerModel.hasMany(this.MarkerDataModel, { foreignKey: "markerId" });
	}

	getPadMarkers(padId: PadId, bbox?: BboxWithZoom & BboxWithExcept): AsyncGenerator<Marker, void, void> {
		return this._db.helpers._getPadObjects<Marker>("Marker", padId, { where: makeBboxCondition(bbox) });
	}

	getPadMarkersByType(padId: PadId, typeId: ID): AsyncGenerator<Marker, void, void> {
		return this._db.helpers._getPadObjects<Marker>("Marker", padId, { where: { padId: padId, typeId: typeId } });
	}

	getMarker(padId: PadId, markerId: ID): Promise<Marker> {
		return this._db.helpers._getPadObject("Marker", padId, markerId);
	}

	async createMarker(padId: PadId, data: Marker<CRU.CREATE_VALIDATED>): Promise<Marker> {
		const type = await this._db.types.getType(padId, data.typeId);

		const result = await this._db.helpers._createPadObject<Marker>("Marker", padId, {
			...data,
			colour: data.colour ?? type.defaultColour,
			size: data.size ?? type.defaultSize,
			symbol: data.symbol ?? type.defaultSymbol,
			shape: data.shape ?? type.defaultShape,
			ele: data.ele ?? await getElevationForPoint(data)
		});

		await this._db.helpers._updateObjectStyles(result);

		this._db.emit("marker", padId, result);
		return result;
	}

	async updateMarker(padId: PadId, markerId: ID, data: Omit<Marker<CRU.UPDATE_VALIDATED>, "id">, doNotUpdateStyles = false): Promise<Marker> {
		const update = { ...data };

		if (update.lat != null && update.lon != null)
			update.ele = await getElevationForPoint({ lat: update.lat, lon: update.lon });

		const result = await this._db.helpers._updatePadObject<Marker>("Marker", padId, markerId, update, doNotUpdateStyles);

		if(!doNotUpdateStyles)
			await this._db.helpers._updateObjectStyles(result);

		this._db.emit("marker", padId, result);

		return result;
	}

	async deleteMarker(padId: PadId, markerId: ID): Promise<Marker> {
		const result = await this._db.helpers._deletePadObject<Marker>("Marker", padId, markerId);
		this._db.emit("deleteMarker", padId, { id: result.id });
		return result;
	}

}