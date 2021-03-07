import WithRender from "./search-box.vue";
import Vue from "vue";
import { Component } from "vue-property-decorator";
import "./search-box.scss";
import context from "../context";
import $ from "jquery";
import { BTab } from "bootstrap-vue";

@WithRender
@Component({
    components: { }
})
export default class SearchBox extends Vue {

	tab = 0;
	touchStartY: number | null = null;

	get isNarrow(): boolean {
		return context.isNarrow;
	}

	handleTouchStart(event: TouchEvent): void {
		if(context.isNarrow && event.touches && event.touches[0] && $(event.target as EventTarget).closest("[draggable=true]").length == 0) {
			const top = (this.$el as HTMLElement).offsetTop;
			this.touchStartY = event.touches[0].clientY - top;
			$(this.$el).css("top", `${top}px`);
		}
	}

	handleTouchMove(event: TouchEvent): void {
		if(this.touchStartY != null && event.touches[0]) {
			const minTop = Math.max(0, ((this.$el as HTMLElement).offsetParent as HTMLElement).offsetHeight - (this.$el as HTMLElement).scrollHeight);
			const maxTop = ((this.$el as HTMLElement).offsetParent as HTMLElement).offsetHeight - 70;
			const top = Math.max(minTop, Math.min(maxTop, event.touches[0].clientY - this.touchStartY));
			$(this.$el).css("top", `${top}px`);
		}
	}

	handleTouchEnd(event: TouchEvent): void {
		if(this.touchStartY != null && event.changedTouches[0]) {
			this.touchStartY = null;
		}
	}

	handleChanged(currentTabs: BTab[], previousTabs: BTab[]): void {
		for (let i = 0; i < currentTabs.length; i++) {
			if (!previousTabs.includes(currentTabs[i])) {
				this.tab = i;
				return;
			}
		}
	}

}