import { io, type ManagerOptions, type Socket as SocketIO, type SocketOptions } from "socket.io-client";
import type { Bbox, BboxWithZoom, CRU, EventHandler, EventName, FindOnMapQuery, FindPadsQuery, FindPadsResult, FindQuery, GetPadQuery, HistoryEntry, ID, Line, LineExportRequest, LineTemplateRequest, LineToRouteCreate, SocketEvents, Marker, MultipleEvents, ObjectWithId, PadData, PadId, PagedResults, SocketRequest, SocketRequestName, SocketResponse, Route, RouteClear, RouteCreate, RouteExportRequest, RouteInfo, RouteRequest, SearchResult, SocketVersion, TrackPoint, Type, View, Writable, SocketClientToServerEvents, SocketServerToClientEvents } from "facilmap-types";

export interface ClientEvents extends SocketEvents<SocketVersion.V2> {
	connect: [];
	disconnect: [string];
	connect_error: [Error];

	error: [Error];
	reconnect: [number];
	reconnect_attempt: [number];
	reconnect_error: [Error];
	reconnect_failed: [];

	serverError: [Error];

	loadStart: [];
	loadEnd: [];

	route: [RouteWithTrackPoints];
	clearRoute: [RouteClear];

	emit: { [eventName in SocketRequestName<SocketVersion.V2>]: [eventName, SocketRequest<SocketVersion.V2, eventName>] }[SocketRequestName<SocketVersion.V2>];
	emitResolve: { [eventName in SocketRequestName<SocketVersion.V2>]: [eventName, SocketResponse<SocketVersion.V2, eventName>] }[SocketRequestName<SocketVersion.V2>];
	emitReject: [SocketRequestName<SocketVersion.V2>, Error];
}

const MANAGER_EVENTS: Array<EventName<ClientEvents>> = ['error', 'reconnect', 'reconnect_attempt', 'reconnect_error', 'reconnect_failed'];

export interface TrackPoints {
	[idx: number]: TrackPoint;
	length: number;
}

export interface LineWithTrackPoints extends Line {
	trackPoints: TrackPoints;
}

export interface RouteWithTrackPoints extends Omit<Route, "trackPoints"> {
	routeId?: string;
	trackPoints: TrackPoints;
}

interface ClientState {
	disconnected: boolean;
	server: string;
	padId: string | undefined;
	bbox: BboxWithZoom | undefined;
	readonly: boolean | undefined;
	writable: Writable | undefined;
	deleted: boolean;
	serverError: Error | undefined;
	loading: number;
	listeningToHistory: boolean;
}

interface ClientData {
	padData: (PadData & { writable: Writable }) | undefined;
	markers: Record<ID, Marker>;
	lines: Record<ID, LineWithTrackPoints>;
	views: Record<ID, View>;
	types: Record<ID, Type>;
	history: Record<ID, HistoryEntry>;
	route: RouteWithTrackPoints | undefined;
	routes: Record<string, RouteWithTrackPoints>;
}

export default class Client {
	private socket: SocketIO;
	private state: ClientState;
	private data: ClientData;

	private listeners: {
		[E in EventName<ClientEvents>]?: Array<EventHandler<ClientEvents, E>>
	} = { };

	constructor(server: string, padId?: string) {
		this.state = this._makeReactive({
			disconnected: true,
			server,
			padId,
			bbox: undefined,
			readonly: undefined,
			writable: undefined,
			deleted: false,
			serverError: undefined,
			loading: 0,
			listeningToHistory: false
		});

		this.data = this._makeReactive({
			padData: undefined,
			markers: { },
			lines: { },
			views: { },
			types: { },
			history: { },
			route: undefined,
			routes: { }
		});

		const serverUrl = typeof location != "undefined" ? new URL(this.state.server, location.href) : new URL(this.state.server);
		const socket = io(`${serverUrl.origin}/v2`, {
			forceNew: true,
			path: serverUrl.pathname.replace(/\/$/, "") + "/socket.io"
		});
		this.socket = socket;

		for(const i of Object.keys(this._handlers) as EventName<ClientEvents>[]) {
			this.on(i, this._handlers[i] as EventHandler<ClientEvents, typeof i>);
		}

		Promise.resolve().then(() => {
			this._simulateEvent("loadStart");
		});

		this.once("connect", () => {
			this._simulateEvent("loadEnd");
		});
	}

	protected _makeReactive<O extends object>(object: O): O {
		return object;
	}

	protected _set<O, K extends keyof O>(object: O, key: K, value: O[K]): void {
		object[key] = value;
	}

	protected _delete<O>(object: O, key: keyof O): void {
		delete object[key];
	}

	protected _decodeData(data: Record<string, string>): Record<string, string> {
		const result = Object.create(null);
		Object.assign(result, data);
		return result;
	}

	private _fixResponseObject<T>(requestName: SocketRequestName<SocketVersion.V2>, obj: T): T {
		if (typeof obj != "object" || !(obj as any)?.data || !["getMarker", "addMarker", "editMarker", "deleteMarker", "getLineTemplate", "addLine", "editLine", "deleteLine"].includes(requestName))
			return obj;

		return {
			...obj,
			data: this._decodeData((obj as any).data)
		};
	}

	private _fixEventObject<T extends any[]>(eventName: EventName<ClientEvents>, obj: T): T {
		if (typeof obj?.[0] != "object" || !obj?.[0]?.data || !["marker", "line"].includes(eventName))
			return obj;

		return [
			{
				...obj[0],
				data: this._decodeData((obj[0] as any).data)
			},
			...obj.slice(1)
		] as T;
	}

	on<E extends EventName<ClientEvents>>(eventName: E, fn: EventHandler<ClientEvents, E>): void {
		if(!this.listeners[eventName]) {
			(MANAGER_EVENTS.includes(eventName) ? this.socket.io as any : this.socket)
				.on(eventName, (...[data]: ClientEvents[E]) => { this._simulateEvent(eventName as any, data); });
		}

		this.listeners[eventName] = [...(this.listeners[eventName] || [] as any), fn];
	}

	once<E extends EventName<ClientEvents>>(eventName: E, fn: EventHandler<ClientEvents, E>): void {
		const handler = ((data: any) => {
			this.removeListener(eventName, handler);
			(fn as any)(data);
		}) as EventHandler<ClientEvents, E>;
		this.on(eventName, handler);
	}

	removeListener<E extends EventName<ClientEvents>>(eventName: E, fn: EventHandler<ClientEvents, E>): void {
		const listeners = this.listeners[eventName] as Array<EventHandler<ClientEvents, E>> | undefined;
		if(listeners) {
			this.listeners[eventName] = listeners.filter((listener) => (listener !== fn)) as any;
		}
	}

	private async _emit<R extends SocketRequestName<SocketVersion.V2>>(eventName: R, ...[data]: SocketRequest<SocketVersion.V2, R> extends undefined | null ? [ ] : [ SocketRequest<SocketVersion.V2, R> ]): Promise<SocketResponse<SocketVersion.V2, R>> {
		try {
			this._simulateEvent("loadStart");

			this._simulateEvent("emit", eventName as any, data as any);

			return await new Promise((resolve, reject) => {
				this.socket.emit(eventName as any, data, (err: Error, data: SocketResponse<SocketVersion.V2, R>) => {
					if(err) {
						reject(err);
						this._simulateEvent("emitReject", eventName as any, err);
					} else {
						const fixedData = this._fixResponseObject(eventName, data);
						resolve(fixedData);
						this._simulateEvent("emitResolve", eventName as any, fixedData as any);
					}
				});
			});
		} finally {
			this._simulateEvent("loadEnd");
		}
	}

	private _handlers: {
		[E in EventName<ClientEvents>]?: EventHandler<ClientEvents, E>
	} = {
		padData: (data) => {
			this._set(this.data, 'padData', data);

			if(data.writable != null) {
				this._set(this.state, 'readonly', data.writable == 0);
				this._set(this.state, 'writable', data.writable);
			}

			const id = this.state.writable == 2 ? data.adminId : this.state.writable == 1 ? data.writeId : data.id;
			if(id != null)
				this._set(this.state, 'padId', id);
		},

		deletePad: () => {
			this._set(this.state, 'readonly', true);
			this._set(this.state, 'writable', 0);
			this._set(this.state, 'deleted', true);
		},

		marker: (data) => {
			this._set(this.data.markers, data.id, data);
		},

		deleteMarker: (data) => {
			this._delete(this.data.markers, data.id);
		},

		line: (data) => {
			this._set(this.data.lines, data.id, {
				...data,
				trackPoints: this.data.lines[data.id]?.trackPoints || { length: 0 }
			});
		},

		deleteLine: (data) => {
			this._delete(this.data.lines, data.id);
		},

		linePoints: (data) => {
			const line = this.data.lines[data.id];
			if(line == null)
				return console.error("Received line points for non-existing line "+data.id+".");

			this._set(line, 'trackPoints', this._mergeTrackPoints(data.reset ? {} : line.trackPoints, data.trackPoints));
		},

		routePoints: (data) => {
			if(!this.data.route) {
				console.error("Received route points for non-existing route.");
				return;
			}

			this._set(this.data.route, 'trackPoints', this._mergeTrackPoints(this.data.route.trackPoints, data));
		},

		routePointsWithId: (data) => {
			const route = this.data.routes[data.routeId];
			if(!route) {
				console.error("Received route points for non-existing route.");
				return;
			}

			this._set(route, 'trackPoints', this._mergeTrackPoints(route.trackPoints, data.trackPoints));
		},

		view: (data) => {
			this._set(this.data.views, data.id, data);
		},

		deleteView: (data) => {
			this._delete(this.data.views, data.id);
			if (this.data.padData) {
				if(this.data.padData.defaultViewId == data.id)
					this._set(this.data.padData, 'defaultViewId', null);
			}
		},

		type: (data) => {
			this._set(this.data.types, data.id, data);
		},

		deleteType: (data) => {
			this._delete(this.data.types, data.id);
		},

		disconnect: () => {
			this._set(this.state, 'disconnected', true);
			this._set(this.data, 'markers', { });
			this._set(this.data, 'lines', { });
			this._set(this.data, 'views', { });
			this._set(this.data, 'history', { });
		},

		connect: () => {
			this._set(this.state, 'disconnected', false); // Otherwise it gets set when padData arrives

			if(this.state.padId)
				this._setPadId(this.state.padId).catch(() => undefined);

			// TODO: Handle errors

			if(this.state.bbox)
				this.updateBbox(this.state.bbox).catch((err) => { console.error("Error updating bbox.", err); });

			if(this.state.listeningToHistory) // TODO: Execute after setPadId() returns
				this.listenToHistory().catch(function(err) { console.error("Error listening to history", err); });

			if(this.data.route)
				this.setRoute(this.data.route).catch((err) => { console.error("Error setting route.", err); });
			for (const route of Object.values(this.data.routes))
				this.setRoute(route).catch((err) => { console.error("Error setting route.", err); });
		},

		history: (data) => {
			this._set(this.data.history, data.id, data);
			// TODO: Limit to 50 entries
		},

		loadStart: () => {
			this._set(this.state, 'loading', this.state.loading + 1);
		},

		loadEnd: () => {
			this._set(this.state, 'loading', this.state.loading - 1);
		}
	};

	setPadId(padId: PadId): Promise<void> {
		if(this.state.padId != null)
			throw new Error("Pad ID already set.");

		return this._setPadId(padId);
	}

	async updateBbox(bbox: BboxWithZoom): Promise<void> {
		this._set(this.state, 'bbox', bbox);
		const obj = await this._emit("updateBbox", bbox);
		this._receiveMultiple(obj);
	}

	async getPad(data: GetPadQuery): Promise<FindPadsResult | undefined> {
		return await this._emit("getPad", data);
	}

	async findPads(data: FindPadsQuery): Promise<PagedResults<FindPadsResult>> {
		return await this._emit("findPads", data);
	}

	async createPad(data: PadData<CRU.CREATE>): Promise<void> {
		const obj = await this._emit("createPad", data);
		this._set(this.state, 'serverError', undefined);
		this._set(this.state, 'readonly', false);
		this._set(this.state, 'writable', 2);
		this._receiveMultiple(obj);
	}

	async editPad(data: PadData<CRU.UPDATE>): Promise<PadData> {
		return await this._emit("editPad", data);
	}

	async deletePad(): Promise<void> {
		return await this._emit("deletePad");
	}

	async listenToHistory(): Promise<void> {
		const obj = await this._emit("listenToHistory");
		this._set(this.state, 'listeningToHistory', true);
		this._receiveMultiple(obj);
	}

	async stopListeningToHistory(): Promise<void> {
		this._set(this.state, 'listeningToHistory', false);
		return await this._emit("stopListeningToHistory");
	}

	async revertHistoryEntry(data: ObjectWithId): Promise<void> {
		const obj = await this._emit("revertHistoryEntry", data);
		this._set(this.data, 'history', {});
		this._receiveMultiple(obj);
	}

	async getMarker(data: ObjectWithId): Promise<Marker> {
		const marker = await this._emit("getMarker", data);
		this._set(this.data.markers, marker.id, marker);
		return marker;
	}

	async addMarker(data: Marker<CRU.CREATE>): Promise<Marker> {
		const marker = await this._emit("addMarker", data);
		// If the marker is out of view, we will not recieve it in an event. Add it here manually to make sure that we have it.
		this._set(this.data.markers, marker.id, marker);
		return marker;
	}

	async editMarker(data: Marker<CRU.UPDATE>): Promise<Marker> {
		return await this._emit("editMarker", data);
	}

	async deleteMarker(data: ObjectWithId): Promise<Marker> {
		return await this._emit("deleteMarker", data);
	}

	async getLineTemplate(data: LineTemplateRequest): Promise<Line> {
		return await this._emit("getLineTemplate", data);
	}

	async addLine(data: Line<CRU.CREATE>): Promise<Line> {
		return await this._emit("addLine", data);
	}

	async editLine(data: Line<CRU.UPDATE>): Promise<Line> {
		return await this._emit("editLine", data);
	}

	async deleteLine(data: ObjectWithId): Promise<Line> {
		return await this._emit("deleteLine", data);
	}

	async exportLine(data: LineExportRequest): Promise<string> {
		return await this._emit("exportLine", data);
	}

	async find(data: FindQuery & { loadUrls?: false }): Promise<SearchResult[]>;
	async find(data: FindQuery & { loadUrls: true }): Promise<string | SearchResult[]>; // eslint-disable-line no-dupe-class-members
	async find(data: FindQuery): Promise<string | SearchResult[]> { // eslint-disable-line no-dupe-class-members
		return await this._emit("find", data);
	}

	async findOnMap(data: FindOnMapQuery): Promise<SocketResponse<SocketVersion.V2, 'findOnMap'>> {
		return await this._emit("findOnMap", data);
	}

	async getRoute(data: RouteRequest): Promise<RouteInfo> {
		return await this._emit("getRoute", data);
	}

	async setRoute(data: RouteCreate): Promise<RouteWithTrackPoints | undefined> {
		const route = await this._emit("setRoute", data);

		if(!route) // A newer submitted route has returned in the meantime
			return undefined;

		const result = {
			...route,
			trackPoints: this._mergeTrackPoints({}, route.trackPoints)
		};

		if (data.routeId)
			this._set(this.data.routes, data.routeId, result);
		else
			this._set(this.data, "route", result);

		this._simulateEvent("route", result);
		return result;
	}

	async clearRoute(data?: RouteClear): Promise<void> {
		if (data?.routeId) {
			this._delete(this.data.routes, data.routeId);
			this._simulateEvent("clearRoute", { routeId: data.routeId });
			return await this._emit("clearRoute", data);
		} else if (this.data.route) {
			this._set(this.data, 'route', undefined);
			this._simulateEvent("clearRoute", { routeId: undefined });
			return await this._emit("clearRoute", data);
		}
	}

	async lineToRoute(data: LineToRouteCreate): Promise<RouteWithTrackPoints | undefined> {
		const route = await this._emit("lineToRoute", data);

		if (!route) // A newer submitted route has returned in the meantime
			return undefined;

		const result = {
			...route,
			trackPoints: this._mergeTrackPoints({}, route.trackPoints)
		};

		if (data.routeId)
			this._set(this.data.routes, data.routeId, result);
		else
			this._set(this.data, "route", result);

		this._simulateEvent("route", result);
		return result;
	}

	async exportRoute(data: RouteExportRequest): Promise<string> {
		return await this._emit("exportRoute", data);
	}

	async addType(data: Type<CRU.CREATE>): Promise<Type> {
		return await this._emit("addType", data);
	}

	async editType(data: Type<CRU.UPDATE>): Promise<Type> {
		return await this._emit("editType", data);
	}

	async deleteType(data: ObjectWithId): Promise<Type> {
		return await this._emit("deleteType", data);
	}

	async addView(data: View<CRU.CREATE>): Promise<View> {
		return await this._emit("addView", data);
	}

	async editView(data: View<CRU.UPDATE>): Promise<View> {
		return await this._emit("editView", data);
	}

	async deleteView(data: ObjectWithId): Promise<View> {
		return await this._emit("deleteView", data);
	}

	async geoip(): Promise<Bbox | null> {
		return await this._emit("geoip");
	}

	disconnect(): void {
		this.socket.offAny();
		this.socket.disconnect();
	}

	private async _setPadId(padId: string): Promise<void> {
		this._set(this.state, 'serverError', undefined);
		this._set(this.state, 'padId', padId);
		try {
			const obj = await this._emit("setPadId", padId);
			this._receiveMultiple(obj);
		} catch(err: any) {
			this._set(this.state, 'serverError', err);
			this._simulateEvent("serverError", err);
			throw err;
		}
	}

	private _receiveMultiple(obj?: MultipleEvents<ClientEvents>): void {
		if (obj) {
			for(const i of Object.keys(obj) as EventName<ClientEvents>[])
				(obj[i] as Array<ClientEvents[typeof i][0]>).forEach((it) => { this._simulateEvent(i, it as any); });
		}
	}

	private _simulateEvent<E extends EventName<ClientEvents>>(eventName: E, ...data: ClientEvents[E]): void {
		const fixedData = this._fixEventObject(eventName, data);

		const listeners = this.listeners[eventName] as Array<EventHandler<ClientEvents, E>> | undefined;
		if(listeners) {
			listeners.forEach(function(listener: EventHandler<ClientEvents, E>) {
				listener(...fixedData);
			});
		}
	}

	private _mergeTrackPoints(existingTrackPoints: Record<number, TrackPoint> | null, newTrackPoints: TrackPoint[]): TrackPoints {
		const ret = { ...(existingTrackPoints || { }) } as TrackPoints;

		for(let i=0; i<newTrackPoints.length; i++) {
			ret[newTrackPoints[i].idx] = newTrackPoints[i];
		}

		ret.length = 0;
		for(const i in ret) {
			if(i != "length")
				ret.length = Math.max(ret.length, parseInt(i) + 1);
		}

		return ret;
	}

	get disconnected(): boolean {
		return this.state.disconnected;
	}

	get server(): string {
		return this.state.server;
	}

	get padId(): string | undefined {
		return this.state.padId;
	}

	get bbox(): BboxWithZoom | undefined {
		return this.state.bbox;
	}

	get readonly(): boolean | undefined {
		return this.state.readonly;
	}

	get writable(): Writable | undefined {
		return this.state.writable;
	}

	get deleted(): boolean {
		return this.state.deleted;
	}

	get serverError(): Error | undefined {
		return this.state.serverError;
	}

	get loading(): number {
		return this.state.loading;
	}

	get listeningToHistory(): boolean {
		return this.state.listeningToHistory;
	}

	get padData(): PadData | undefined {
		return this.data.padData;
	}

	get markers(): Record<ID, Marker> {
		return this.data.markers;
	}

	get lines(): Record<ID, LineWithTrackPoints> {
		return this.data.lines;
	}

	get views(): Record<ID, View> {
		return this.data.views;
	}

	get types(): Record<ID, Type> {
		return this.data.types;
	}

	get history(): Record<ID, HistoryEntry> {
		return this.data.history;
	}

	get route(): RouteWithTrackPoints | undefined {
		return this.data.route;
	}

	get routes(): Record<string, RouteWithTrackPoints> {
		return this.data.routes;
	}
}
