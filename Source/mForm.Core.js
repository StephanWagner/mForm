/*
---
description: mForm helps you to make your forms and form elements nicer, better and more awesome.

authors: Stephan Wagner

license: MIT-style

requires:
 - core/1.4.5: '*'
 - more/Element.Measure

provides: [mForm]

documentation: http://htmltweaks.com/mForm/Documentation
...
*/

var mForm = new Class({
	
	Implements: [Options, Events],

	options: {
		
		submitFormOnControlS: true,				// submits your form when pressing control + s in textareas or input fields
		submitFormOnEnter: true,				// submits your form when pressing enter in input fields
		
		validateElements: {
			enabled: true,						// false wont validate any elements
			attribute: 'data-validate',			// elements with attribute data-validate and with a value will be validated
			errorClass: 'input_error',			// add this class if the element has no value but is a required element
			autoValidate: false,				// the errorClass will be added / removed automatically on blur
			
			requiredElements: {					// currently supported for: text-elements, select fields
				attribute: 'data-required',		// elements with attribute data-required will be added the required events and classes
				hide: false,					// set to true to hide the notice that the element is required (you can also set data-required="true" to hide it from a single element)
				requiredClass: 'required',		// add this class for required fields (having no value)
				hiddenRequiredClass:			// aditionally add this class if the required notice should be hidden
					'required_hidden'
			}
		},
		
		customPlaceholders: {
			enabled: true,				// false to disable custom placeholders
			attribute: 'placeholder', 	// add cross-browser placeholders to input elements with this attribute
			allBrowsers: false			// sets the custom placeholders even if the browser has its own placeholder function (safari, chrome, firefox > 3.6 etc.)
		},
		
		customSelectElements: {
			enabled: true,
			attribute: 'data-select'	// select fields with this attribute will be replaced width the custom select field (formElements.Select.js needs to be loaded)
		},								// you can use options as value (data-select="") see formElements.Select.js for more info
		
		customNumberElements:	{
			enabled: true,				// false to disable custom numer elements
			attribute: 'data-number'	// textfields with this attribute will only allow numbers to be typed in // TODO 'hours' 'minutes'
		}
	},
	
	// initialize
	initialize: function(options) {
		// set options
		this.setOptions(options);
		
		// all input field types
		this.textFieldTypes = ['text', 'password', 'date', 'datetime', 'datetime-local', 'email', 'month', 'number', 'search', 'tel', 'time', 'url', 'week'];
	},
	
	// re-initialize mForm (e.g. after an ajax call)
	reInit: function() {
		// add control + s form submit events
		if (this.options.submitFormOnControlS || this.options.submitFormOnEnter) {
			this.setSubmitFormEvents();
		}
		// add custom placeholders
		if (this.options.customPlaceholders.enabled) {
			this.setPlaceholders();
		}
		// set required events (needs to be before any custom element to ensure required classes are added)
		if (this.options.validateElements.enabled) {
			this.setRequiredElements();
		}
		// set required events (needs to be before any custom element to ensure required classes are added)
		if (this.options.validateElements.enabled) {
			this.setRequiredElements();
			this.setValidateElements();
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
		
		// fix firefox textareas +1 row bug
		if(Browser.firefox) {
			$$('textarea[rows]').each(function(el) {
				if(!el.retrieve('ffRowsFixed')) {
					var rows = el.get('rows').toInt();
					if (rows > 1) {
						el.set('rows', (rows - 1));
					}
					el.store('ffRowsFixed', true);
				}
			});
		}
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
			if(!el.getAttribute('data-blocksubmit')) {
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
			}
		}.bind(this));
	},
	
	// add cross-browser placeholders to input elements
	setPlaceholders: function(elements) {
		if (!this.options.customPlaceholders.enabled ||
			(!this.options.customPlaceholders.allBrowsers && ((Browser.firefox && Browser.version >= 3.7) || (Browser.opera && Browser.version >= 11) || Browser.safari || Browser.chrome))) {
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
	
	// set error classes if needed or remove them
	setErrorClasses: function(el) {
		if(el.hasClass(this.options.validateElements.errorClass) && this.validateElement(el)) {
			el.removeClass(this.options.validateElements.errorClass);
		} else if (this.options.validateElements.autoValidate && !this.validateElement(el)) {
			el.addClass(this.options.validateElements.errorClass);
		}
	},
	
	// add validation events to elements
	setValidateElements: function(elements) {
		this.getElements(elements, $$('*[' + this.options.validateElements.attribute + '], *[' + this.options.validateElements.requiredElements.attribute + ']')).each(function(el) {
			if (!el.retrieve('validateAdded')) {
				if(el.get('tag') == 'select') {
					el.addEvent('change', function() {
						this.setErrorClasses(el);
					}.bind(this));
				}
				el.addEvent('blur', function() {
					this.setErrorClasses(el);
				}.bind(this));
				el.store('validateAdded', true);
			}
		}.bind(this));
	},
	
	// validate an element
	validateElement: function(el, value) {
		el = $(el);
		value = value || el.value;
		
		if(this.getRequired(el, value)) return false;
		if(value.length == 0 || el.getAttribute(this.options.validateElements.attribute) == null) return true;
		
		var validate = el.getAttribute(this.options.validateElements.attribute).split(':');
		
		switch(validate[0]) {
			case 'email':
			if(!(/^(?:[a-z0-9!#$%&'*+\/=?^_`{|}~-]\.?){0,63}[a-z0-9!#$%&'*+\/=?^_`{|}~-]@(?:(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\])$/i).test(value)) {
				return false;
			}
			break;
			case 'min':
			var value = validate[2] ? value.clean() : value;
			var min = validate[1] ? validate[1].toInt() : 0;
			if(value.length < min) {
				return false;
			}
			break;
			default:
			if(el.getAttribute(this.options.validateElements.attribute).length > 3 && !el.getAttribute(this.options.validateElements.attribute).test(value)) {
				return false;
			}
		}
		return true;
	},
	
	// set required element classes and return true if the element is required
	setRequired: function(el, value) {
		el = $(el);
		value = value || el.value;
		if(el.getAttribute(this.options.validateElements.requiredElements.attribute) != null) {
			if (value.clean().length == 0) { 
				el.addClass(this.options.validateElements.requiredElements.requiredClass);
				return true;
			} else {
				el.removeClass(this.options.validateElements.requiredElements.requiredClass);
			}
		}
		return false;
	},
	
	// get required for better understanding
	getRequired: function(el, value) {
		return this.setRequired(el, value);
	},
	
	// add events to required elements
	setRequiredElements: function(elements) {
		this.getElements(elements, $$('*[' + this.options.validateElements.requiredElements.attribute + ']')).each(function(el) {
			if (el.getAttribute(this.options.validateElements.requiredElements.attribute) != null) {
				if (!el.retrieve('requiredAdded')) {
					if (el.getAttribute(this.options.validateElements.requiredElements.attribute) || this.options.validateElements.requiredElements.hide) {
						el.addClass(this.options.validateElements.requiredElements.hiddenRequiredClass);
					}
					if (el.get('tag') == 'textarea' || (el.get('tag') == 'input' && this.textFieldTypes.contains(el.get('type')))) {
						el.addEvent('keyup', function() {
							this.setRequired(el);
						}.bind(this));
					} else if (el.get('tag') == 'select') {
						el.addEvent('change', function() {
							this.setRequired(el);
						}.bind(this));
					}
					el.addEvent('blur', function() {
						this.setRequired(el);
					}.bind(this));
					el.store('requiredAdded', true);
				}
				this.setRequired(el);
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
		
		parent.getElements('.' + this.options.validateElements.errorClass).each(function(el) { el.removeClass(this.options.validateElements.errorClass); }.bind(this));
		
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
	form.reInit();
});