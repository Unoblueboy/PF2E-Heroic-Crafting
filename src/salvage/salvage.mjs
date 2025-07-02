const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const { DragDrop } = foundry.applications.ux;

export async function salvage(actor, item) {
	// Pass
	new SalvageApplication().render(true);
}

class SalvageApplication extends HandlebarsApplicationMixin(ApplicationV2) {
	constructor(options = {}) {
		super(options);
		console.log(this.options);
	}

	static DEFAULT_OPTIONS = {
		dragDrop: [{ dragSelector: "[data-item-list]", dropSelector: "[data-drop]" }],
	};

	/** @override */
	static PARTS = {
		main: { template: "modules/pf2e-heroic-crafting/templates/salvage/main.hbs" },
	};

	/**
	 * Callback actions which occur at the beginning of a drag start workflow.
	 * @param {DragEvent} event       The originating DragEvent
	 * @protected
	 */
	_onDragStart(event) {
		console.log("_onDragStart", event);
		console.log(foundry.applications.ux.TextEditor.getDragEventData(event));
		const el = event.currentTarget;
		if ("link" in event.target.dataset) return;

		// Extract the data you need
		let dragData = null;

		if (!dragData) return;

		// Set data transfer
		event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
	}

	/**
	 * Callback actions which occur when a dragged element is over a drop target.
	 * @param {DragEvent} event       The originating DragEvent
	 * @protected
	 */
	_onDragOver(event) {
		console.log("_onDragOver", event);
		console.log(foundry.applications.ux.TextEditor.getDragEventData(event));
	}

	/**
	 * Callback actions which occur when a dragged element is dropped on a target.
	 * @param {DragEvent} event       The originating DragEvent
	 * @protected
	 */
	async _onDrop(event) {
		console.log("onDrop", event);
		console.log(foundry.applications.ux.TextEditor.getDragEventData(event));
		const data = foundry.applications.ux.TextEditor.getDragEventData(event);

		// Handle different data types
		switch (
			data.type
			// write your cases
		) {
		}
	}

	/**
	 * Actions performed after any render of the Application.
	 * Post-render steps are not awaited by the render process.
	 * @param {ApplicationRenderContext} context      Prepared context data
	 * @param {RenderOptions} options                 Provided render options
	 * @protected
	 */
	_onRender(context, options) {
		new foundry.applications.ux.DragDrop.implementation({
			dragSelector: ".data-item-list",
			dropSelector: "[data-drop]",
			callbacks: {
				dragstart: this._onDragStart.bind(this),
				dragover: this._onDragOver.bind(this),
				drop: this._onDrop.bind(this),
			},
		}).bind(this.element);
	}

	#dragDrop;

	// Optional: Add getter to access the private property

	/**
	 * Returns an array of DragDrop instances
	 * @type {DragDrop[]}
	 */
	get dragDrop() {
		return this.#dragDrop;
	}
}
