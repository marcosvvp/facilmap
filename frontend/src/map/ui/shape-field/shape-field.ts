import WithRender from "./shape-field.vue";
import Vue from "vue";
import { BFormInput } from "bootstrap-vue";
import "./shape-field.scss";
import { getMarkerUrl, shapeList } from "facilmap-leaflet";
import { Component } from "vue-property-decorator";
import Icon from "../icon/icon";
import { quoteHtml } from "facilmap-utils";
import FieldPopover from "../field-popover/field-popover";
import { Shape } from "facilmap-types";

@WithRender
@Component({
	components: { FieldPopover, Icon },
	props: {
		...(BFormInput as any).options.props
	}
})
export default class ShapeField extends Vue {

	id!: string;
	value!: Shape | undefined;
	filter = "";
	popoverOpen = false;

	get valueSrc(): string {
		return getMarkerUrl("000000", 25, undefined, this.value);
	}

	get filteredShapes(): Shape[] {
		if (this.filter.trim() == "")
			return shapeList;
		
		const lowerFilter = this.filter.toLowerCase();
		return shapeList.filter((icon) => icon.toLowerCase().includes(lowerFilter));
	}

	get shapesCode(): string {
		return this.filteredShapes.map((shape) => (`
			<li>
				<a href="javascript:" data-fm-shape="${quoteHtml(shape)}" class="dropdown-item${shape === this.value ? ' active' : ''}">
					<img src="${getMarkerUrl("000000", 25, undefined, shape)}">
				</a>
			</li>
		`)).join('');
	}

	handleClick(e: MouseEvent): void {
		const shape = (e.target as HTMLElement).closest("[data-fm-shape]")?.getAttribute("data-fm-shape");
		if (shape)
			this.$emit("input", shape);
	}

	handleEscape(event: KeyboardEvent): void {
		if (this.popoverOpen) {
			event.preventDefault();
			event.stopPropagation(); // Prevent closing modal
			this.popoverOpen = false;
			document.getElementById(this.id)!.focus();
		}
	}

}