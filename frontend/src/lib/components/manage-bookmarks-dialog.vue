<script setup lang="ts">
	import storage, { type Bookmark } from "../utils/storage";
	import Icon from "./ui/icon.vue";
	import Draggable from "vuedraggable";
	import { computed } from "vue";
	import ModalDialog from "./ui/modal-dialog.vue";
	import { injectContextRequired, requireClientContext } from "./facil-map-context-provider/facil-map-context-provider.vue";
	import { useI18n } from "../utils/i18n";

	const context = injectContextRequired();
	const client = requireClientContext(context);
	const i18n = useI18n();

	const emit = defineEmits<{
		hidden: [];
	}>();

	const isBookmarked = computed(() => {
		return !!client.value.mapId && storage.bookmarks.some((bookmark) => bookmark.id == client.value.mapId);
	});

	function deleteBookmark(bookmark: Bookmark): void {
		const index = storage.bookmarks.indexOf(bookmark);
		if (index != -1)
			storage.bookmarks.splice(index, 1);
	}

	function addBookmark(): void {
		storage.bookmarks.push({ id: client.value.mapId!, mapId: client.value.mapData!.id, name: client.value.mapData!.name });
	}
</script>

<template>
	<ModalDialog
		:title="i18n.t('manage-bookmarks-dialog.title')"
		size="lg"
		class="fm-manage-bookmarks"
		@hidden="emit('hidden')"
	>
		<p>{{i18n.t("manage-bookmarks-dialog.introduction")}}</p>
		<table class="table table-striped table-hover">
			<thead>
				<tr>
					<th>{{i18n.t("manage-bookmarks-dialog.map-id")}}</th>
					<th>{{i18n.t("manage-bookmarks-dialog.name")}}</th>
					<th></th>
				</tr>
			</thead>
			<Draggable
				v-model="storage.bookmarks"
				tag="tbody"
				handle=".fm-drag-handle"
				:itemKey="(bookmark: any) => storage.bookmarks.indexOf(bookmark)"
			>
				<template #item="{ element: bookmark }">
					<tr>
						<td class="align-middle text-break" :class="{ 'font-weight-bold': bookmark.id == client.mapId }">
							{{bookmark.id}}
						</td>
						<td class="align-middle">
							<input class="form-control" v-model="bookmark.customName" :placeholder="bookmark.name" />
						</td>
						<td class="align-middle td-buttons text-right">
							<button type="button" class="btn btn-secondary" @click="deleteBookmark(bookmark)">{{i18n.t("manage-bookmarks-dialog.delete")}}</button>
							<button type="button" class="btn btn-secondary fm-drag-handle"><Icon icon="resize-vertical" :alt="i18n.t('manage-bookmarks-dialog.reorder-alt')"></Icon></button>
						</td>
					</tr>
				</template>
			</Draggable>
			<tfoot v-if="client.mapData && !isBookmarked">
				<tr>
					<td colspan="3">
						<button type="button" class="btn btn-secondary" @click="addBookmark()">{{i18n.t("manage-bookmarks-dialog.bookmark-current")}}</button>
					</td>
				</tr>
			</tfoot>
		</table>
	</ModalDialog>
</template>