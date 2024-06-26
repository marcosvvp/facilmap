import Carousel from "bootstrap/js/dist/carousel";
import { type Ref, reactive, readonly, watch } from "vue";

export interface CarouselContext {
	tab: number;
	setTab(tab: number): void;
}

export function useCarousel(element: Ref<HTMLElement | undefined>): Readonly<CarouselContext> {
	const context = reactive<CarouselContext>({
		tab: 0,
		setTab: (tab) => {
			const carousel = element.value && Carousel.getInstance(element.value);
			if (carousel) {
				carousel.to(tab);
			} else {
				context.tab = tab;
			}
		}
	});

	watch(element, (newRef, oldRef, onCleanup) => {
		if (newRef) {
			const carousel = new Carousel(newRef, {
				interval: 0,
				wrap: false
			});

			if (context.tab !== 0) {
				carousel.to(context.tab);
			}

			newRef.addEventListener("slid.bs.carousel", handleSlid);

			onCleanup(() => {
				carousel.dispose();
				newRef.removeEventListener("slid.bs.carousel", handleSlid);
			});
		}
	});

	function handleSlid(e: Event) {
		const event = e as Event & Carousel.Event;
		context.tab = event.to;
	}

	return readonly(context);
}