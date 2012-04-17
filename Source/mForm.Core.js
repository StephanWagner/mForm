/*
---
description: mForm helps you to make your forms and form elements nicer, better and more awesome.

authors: Stephan Wagner

license: MIT-style

requires:
 - core/1.4.5: '*'
 - more/Element.Measure

provides: [mForm]

documentation: http://www.htmltweaks.com/mForm/Documentation
...
*/

var mForm = new Class({
	
	Implements: [Options, Events],

	options: {
		
		submitFormOnControlS: true,					// submits your form when pressing control + s in textareas or input fields
		submitFormOnEnter: true,					// submits your form when pressing enter in input fields
		
		requiredElements: {							// currently supported for: text-elemets, selects-fields
			enabled: true,							// false to disable required Elements
			attribute: 'data-required',				// elements with attribute data-required will be added the required events and classes
			hide: false,							// set to true to hide the notice that the element is required (you can also set data-required="true" to hide it from a single element)
			requiredClass: 'required',				// add this class for required fields
			hiddenRequiredClass: 'required_hidden',	// aditionally add this class if the required notice should be hidden
			errorClass: 'input_error',				// add this class if the element has no value but is a required element
			addValidateEvents: false				// the errorClass will be added / removed automatically on blur
		},
		
		customPlaceholders: {
			enabled: true,					// false to disable custom placeholders
			attribute: 'placeholder', 		// add cross-browser placeholders to input elements with this attribute
			allBrowsers: false				// sets the custom placeholders even if the browser has its own placeholder function (safari, chrome, firefox > 3.6 etc.)
		},
		
		customSelectElements: {
			enabled: true,
			attribute: 'data-select'		// select fields with this attribute will be replaced width the custom select field (formElements.Select.js needs to be loaded)
		},									// you can use options as value (data-select="") see formElements.Select.js for more info
		
		customNumberElements:	{
			enabled: true,					// false to disable custom numer elements
			attribute: 'data-number'		// textfields with this attribute will only allow numbers to be typed in // TODO 'hours' 'minutes'
		}
	},
	
	// initialize
	initialize: function(options) {
		// set options
		this.setOptions(options);
		
		// all input field types
		this.textFieldTypes = ['text', 'password', 'date', 'datetime', 'datetime-local', 'email', 'month', 'number', 'search', 'tel', 'time', 'url', 'week'];
		
		// initialize events
		this.reInit();
	},
	
	// re-initialize mForm (e.g. after an ajax call)
	reInit: function() {
		// add control + s form submit events
		if (this.options.submitFormOnControlS) {
			this.setSubmitFormEvents();
		}
		// add custom placeholders
		if (this.options.customPlaceholders.enabled) {
			this.setPlaceholders();
		}
		// set required events (needs to be before any custom element to ensure required classes are added)
		if (this.options.requiredElements.enabled) {
			this.setRequiredElements();
		}
		// replace select fields with customly designed select fields
		if (this.options.customSelectElements.enabled && mForm.Element && mForm.Element.Select) {
			this.setCustomSelectElements();
		}
		// add events to textfield only allowing numbers
		if (this.options.customNumberElements.enabled) {
			this.setCustomNumberElements();
		}
		// fix buttons without type submit to submit the form
		$$('button').each(function(el) {
			if (!el.retrieve('buttonFixed') && el.getAttribute('type') != 'submit') {
				el.addEvent('click', function(ev) {
					ev.preventDefault();
				}).store('buttonFixed');
			}
		});
	},
	
	// get options of a attribute
	getOptionsOfAttribute: function(attribute_value) {		
		var eval_options = (attribute_value.substr(0, 1) == "{" && attribute_value.substr((attribute_value.length - 1), 1) == "}" ? attribute_value : '{}');
		eval('options = ' + eval_options + ';');
		return options;
	},
	
	// get an array of all posiible elements or default value
	getElements: function(elements, default_elements) {
		return $(elements) ? [$(elements)] : 
			(elements ? Array.from($(elements)).combine(Array.from($$('.' + elements))).combine(Array.from($$(elements))).clean() : default_elements);
	},
	
	// add control + s event to textareas and textfields
	setSubmitFormEvents: function(elements) {
		this.getElements(elements, $$('textarea, input[type=text], input[type=password], input[type=date], input[type=datetime], input[type=datetime-local], input[type=email], input[type=month], input[type=number], input[type=search], input[type=tel], input[type=time], input[type=url], input[type=week]')).each(function(el) {
			el.addEvent('keydown', function(ev) {
				if (el.getParent('form') && (
					(this.options.submitFormOnControlS && (ev.key == 's' && (ev.control || (Browser.Platform.mac && ev.meta)))) ||
					(this.options.submitFormOnEnter && ev.key == 'enter' && el.get('tag') != 'textarea'))) {
					ev.preventDefault();
					el.blur();
					if (el.getParent('form').retrieve('events') && el.getParent('form').retrieve('events')['submit']) {
						el.getParent('form').fireEvent('submit');
					} else {
						el.getParent('form').submit();
					}
				}
			}.bind(this));
		}.bind(this));
	},
	
	// add cross-browser placeholders to input elements
	setPlaceholders: function(elements) {
		if (!this.options.customPlaceholders.allBrowsers && ((Browser.firefox && Browser.version >= 3.7) || Browser.safari || Browser.chrome)) {
			return false;
		}
		this.getElements(elements, $$('*[' + this.options.customPlaceholders.attribute + ']')).each(function(el) {
			if(!el.get('id')) {
				el.set('id', 'mFormPlaceholder' + mForm.customId++);
			}
			if (!el.retrieve('customPlaceholderAdded') && el.getAttribute(this.options.customPlaceholders.attribute).clean().length > 0 && ((el.get('tag') == 'input' && this.textFieldTypes.contains(el.get('type'))) || el.get('tag') == 'textarea')) {
				
				var placeholder = new Element('label', {
					styles: {
						position: 'absolute',
						paddingTop: el.getStyle('paddingTop').toInt() + el.getStyle('borderTopWidth').toInt(),
						paddingLeft: el.getStyle('paddingLeft').toInt() + el.getStyle('borderLeftWidth').toInt() + 1,
						fontSize: el.getStyle('fontSize'),
						lineHeight: el.getStyle('lineHeight'),
						fontFamily: el.getStyle('fontFamily'),
						letterSpacing: el.getStyle('letterSpacing'),
						display: 'none'
					},
					'class': 'placeholder',
					'for': el.get('id'),
					html: el.get('placeholder')
				}),
				
				wrapperStyles = el.getStyles('position', 'top', 'left', 'bottom', 'right', 'zIndex', 'float', 'display', 'marginBottom', 'marginLeft', 'marginTop', 'marginRight'),
				elDimensions = el.getDimensions({computeSize: true});
				
				if (wrapperStyles.position == 'static') {
					wrapperStyles.position = 'relative';
				}
				if (wrapperStyles.display == 'inline') {
					wrapperStyles.display = 'block';
				}
				wrapperStyles.width = elDimensions.totalWidth;
				wrapperStyles.height = elDimensions.totalHeight;
				
				new Element('span', {styles: wrapperStyles}).inject(el, 'after').grab(el).grab(placeholder);
				
				el.setStyles({
					margin: 0,
					position: 'absolute',
					top: 0,
					left: 0
				}).addEvents({
					focus: function() {
						if (el.value == '') {
							placeholder.setStyle('display', '').addClass('placeholder_focus');
						}
					},
					keyup: function() {
						if (el.value == '') {
							placeholder.setStyle('display', '');
						}
						else if (el.value.length > 0) {
							placeholder.setStyle('display', 'none');
						}
					},
					keydown: function(ev) {
						if (ev.code >= 32 && ev.code != 127 && el.value.length == 0) {
							placeholder.setStyle('display', 'none');
						}
					},
					blur: function() {
						if (el.value == '') {
							placeholder.setStyle('display', '').removeClass('placeholder_focus');
						}
						else if (el.value.length > 0) {
							placeholder.setStyle('display', 'none');
						}
					}
				});
				el.set('placeholder', '').store('customPlaceholderAdded', true).store('placeholder', placeholder);
			}
			if (el.value == '' && el.retrieve('placeholder')) {
				el.retrieve('placeholder').setStyle('display', '').removeClass('placeholder_focus');
			} else if (el.retrieve('placeholder')) {
				el.retrieve('placeholder').setStyle('display', 'none');
			}
		}.bind(this));
	},
	
	// set required element classes
	setRequiredElementClasses: function(el, value, auto_validate) {
		el = $(el);
		if (value.length == 0) { 
			el.addClass(this.options.requiredElements.requiredClass + ((this.options.requiredElements.addValidateEvents && auto_validate) ? ' ' + this.options.requiredElements.errorClass : ''));
		} else {
			el.removeClass(this.options.requiredElements.requiredClass).removeClass(this.options.requiredElements.errorClass);
		}
	},
	
	// add events to required elements
	setRequiredElements: function(elements) {
		this.getElements(elements, $$('*[' + this.options.requiredElements.attribute + ']')).each(function(el) {
			if (el.getAttribute(this.options.requiredElements.attribute) != null) {
				if (!el.retrieve('requiredAdded')) {
					if (el.getAttribute(this.options.requiredElements.attribute) || this.options.requiredElements.hide) {
						el.addClass(this.options.requiredElements.hiddenRequiredClass);
					}
					if (el.get('tag') == 'textarea' || (el.get('tag') == 'input' && this.textFieldTypes.contains(el.get('type')))) {
						el.addEvent('keyup', function() {
							this.setRequiredElementClasses(el, el.value, true);
						}.bind(this));
					} else if (el.get('tag') == 'select') {
						el.addEvent('change', function() {
							this.setRequiredElementClasses(el, el.value, true);
						}.bind(this));
					}
					el.addEvent('blur', function() {
						this.setRequiredElementClasses(el, el.value, true);
					}.bind(this));
					el.store('requiredAdded', true);
				}
				this.setRequiredElementClasses(el, el.value);
			}
		}.bind(this));
	},
	
	// replace select fields with customly designed select fields
	setCustomSelectElements: function(elements) {
		this.getElements(elements, $$('*[' + this.options.customSelectElements.attribute + ']')).each(function(el) {
			if (!el.retrieve('customSelectAdded') && el.get('tag') == 'select') {
				var options = this.getOptionsOfAttribute(el.getAttribute(this.options.customSelectElements.attribute));
				if (!$(options.original)) {
					options.original = el;
				}
				new mForm.Element.Select(options);
				el.store('customSelectAdded', true);
			}
		}.bind(this));
	},
	
	// add onlyNumbers events to input fields
	setCustomNumberElements: function(elements) {
		this.getElements(elements, $$('*[' + this.options.customNumberElements.attribute + ']')).each(function(el) {
			if (!el.retrieve('onlyNumbersAdded')) {
				el.addEvent('keydown', function(ev) {
					if ((ev.shift && !ev.key == 'tab') || (!(ev.code >= 96 && ev.code <= 105) && !['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'enter', 'tab', 'up', 'down', 'left', 'right', 'backspace', 'delete'].contains(ev.key))) {
						return false;
					}
				}).store('onlyNumbersAdded', true);
			}
		});
	},
	
	// reset all the forms values
	reset: function(parent) {
		if($(parent) && $(parent).get('tag') == 'form') {
			var forms = [$(parent)];
		} else if($(parent)) {
			var forms = $(parent).getElements('form');
		} else if($(this.options.form) && $(this.options.form).get('tag') == 'form') {
			var forms = [$(this.options.form)];
		} else {
			var forms = $(document.body).getElements('form');
		}
		forms.each(function(form) { form.reset(); });
		
		parent = $(parent) ? $(parent) : $(document.body);
		
		parent.getElements('.' + this.options.requiredElements.errorClass).each(function(el) { el.removeClass(this.options.requiredElements.errorClass); });
		
		this.setRequiredElements();
		this.setPlaceholders();
		
		// TODO select default value in select fields
		return this;
	}
	
});

// global id for custom placeholders in legacy browser
mForm.customId = 0;

// Initialize mForm
var form;
window.addEvent('domready', function() {
	form = new mForm();
});