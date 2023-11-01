import { viewValidator } from "./view.js";
import { idValidator } from "./base.js";
import * as z from "zod";
import { CRU, CRUType, cruValidator } from "./cru";

export const padIdValidator = z.string();
export type PadId = z.infer<typeof padIdValidator>;

export enum Writable {
	READ = 0,
	WRITE = 1,
	ADMIN = 2
}
export const writableValidator = z.nativeEnum(Writable);

export const padDataValidator = cruValidator({
	allPartialUpdate: {
		id: padIdValidator,
		name: z.string(),
		searchEngines: z.boolean(),
		description: z.string(),
		clusterMarkers: z.boolean(),
		legend1: z.string(),
		legend2: z.string(),
		defaultViewId: idValidator.or(z.null())
	},
	onlyRead: {
		writable: writableValidator,
		defaultView: viewValidator.read.optional()
	},
	exceptCreate: {
		writeId: padIdValidator.optional(),
		adminId: padIdValidator.optional()
	},
	onlyCreate: {
		writeId: padIdValidator,
		adminId: padIdValidator
	}
});

export type PadData<Mode extends CRU = CRU.READ> = CRUType<Mode, typeof padDataValidator>;
