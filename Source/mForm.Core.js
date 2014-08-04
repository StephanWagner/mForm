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
		
		submitFormOnControlS: true,		// submits your form when pressing [control] + [s] in textareas or input fields
		submitFormOnEnter: true,		// submits your form when pressing [enter] in input fields (set to 'default' to use the browsers default setting)
		
		validateOnBlur: false,			// true will validate elements when they loose focus (onBlur)
		
		customPlaceholders: {
			enabled: true,				// false will disable custom placeholders
			allBrowsers: false			// sets the custom placeholders even if the browser has its own placeholder function (safari, chrome, firefox >= 3.7, opera >= 11)
		}
	},
	
	// initialize
	initialize: function(options) {
		// set options
		this.setOptions(options);
		
		// all input field types
		this.textFieldTypes = ['text', 'password', 'date', 'datetime', 'datetime-local', 'email', 'month', 'number', 'search', 'tel', 'time', 'url', 'week'];
	},
	
	// initialize and re-initialize mForm (e.g. after an ajax call)
	reInit: function() {
		// add control + s and enter submit events
		if (this.options.submitFormOnControlS || this.options.submitFormOnEnter != 'default') {
			this.setSubmitFormEvents();
		}
		// add custom placeholders
		if (this.options.customPlaceholders.enabled) {
			this.setPlaceholders();
		}
		// set required events (needs to be before any custom element to ensure required classes are added)
		this.setRequiredElements();
		
		// set the validation events
		if (this.options.validateOnBlur) {
			this.setValidateElements();
		}
		// replace select fields with customly designed select fields
		if (mForm.Element && mForm.Element.Select) {
			this.setCustomSelectElements();
		}
		// add events to textfield only allowing numbers
		this.setCustomNumberElements();
		
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
					if (rows > 1) el.set('rows', (rows - 1));
					el.store('ffRowsFixed', true);
				}
			});
		}
	},
	
	// get options of an attribute
	getOptionsOfAttribute: function(attribute_value) {		
		var eval_options = (attribute_value.substr(0, 1) == "{" && attribute_value.substr((attribute_value.length - 1), 1) == "}" ? attribute_value : '{}');
		eval('options = ' + eval_options + ';');
		return options;
	},
	
	// get the elements to use
	getElements: function(elements, default_elements) {
		return $(elements) ? [$(elements)] : (elements ? elements : default_elements);
	},
	
	// add control + s and enter submit events
	setSubmitFormEvents: function(elements) {
		this.getElements(elements, $$('textarea, input[type=text], input[type=password], input[type=date], input[type=datetime], input[type=datetime-local], input[type=email], input[type=month], input[type=number], input[type=search], input[type=tel], input[type=time], input[type=url], input[type=week]')).each(function(el) {
			if (!el.hasAttribute('data-blocksubmit') && !el.retrieve('submitAdded')) {
				el.addEvent('keydown', function(ev) {
					if (el.getParent('form')) {
						if (!this.options.submitFormOnEnter && ev.key == 'enter' && el.get('tag') != 'textarea') {
							ev.preventDefault();
						}
						if ((this.options.submitFormOnControlS && (ev.key == 's' && (ev.control || (Browser.Platform.mac && ev.meta)))) ||
							(this.options.submitFormOnEnter && ev.key == 'enter' && (el.get('tag') != 'textarea' || (el.get('tag') == 'textarea' && el.getAttribute('data-submitOnEnter') != null && !ev.shift)))) {
							ev.preventDefault();
							el.blur();
							if (el.getParent('form').retrieve('events') && el.getParent('form').retrieve('events')['submit']) {
								el.getParent('form').fireEvent('submit');
							} else {
								el.getParent('form').submit();
							}
						}
					}
				}.bind(this));
				el.store('submitAdded', true);
			}
		}.bind(this));
	},
	
	// add custom placeholders
	setPlaceholders: function(elements) {
		if (!this.options.customPlaceholders.enabled || (!this.options.customPlaceholders.allBrowsers && ((Browser.firefox && Browser.version >= 3.7) || (Browser.opera && Browser.version >= 11) || Browser.safari || Browser.chrome))) {
			return false;
		}
		this.getElements(elements, $$('*[placeholder]')).each(function(el) {
			if (!el.retrieve('customPlaceholderAdded') && el.getAttribute('placeholder').clean().length > 0 && ((el.get('tag') == 'input' && this.textFieldTypes.contains(el.get('type'))) || el.get('tag') == 'textarea')) {
				if (!el.get('id')) {
					el.set('id', 'mFormPlaceholder' + mForm.customPlaceholderId++);
				}
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
					'class': 'placeholder noselect',
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
				if(elDimensions.totalWidth > 0 && elDimensions.totalHeight > 0) {
					wrapperStyles.width = elDimensions.totalWidth;
					wrapperStyles.height = elDimensions.totalHeight;
				}
				
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
	
	// validate an element
	validateElement: function(el, value) {
		value = value || el.value;
		if (this.getRequired(el, value)) return false;
		if (value.length == 0 || !el.hasAttribute('data-validate')) return true;

		var validate = el.getAttribute('data-validate').split(':');
		
		switch(validate[0]) {
			case 'email':
			return (/^(?:[a-z0-9!#$%&'*+\/=?^_`{|}~-]\.?){0,63}[a-z0-9!#$%&'*+\/=?^_`{|}~-]@(?:(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\])$/i).test(value);
			break;
			case 'min':
			return !((validate[2] ? value.length : value.clean().length) < (validate[1] ? validate[1].toInt() : 0));
			break;
			case 'max':
			return !((validate[2] ? value.length : value.clean().length) > (validate[1] ? validate[1].toInt() : 0));
			break;
			default:
			return el.getAttribute('data-validate').length >= 3 && (el.getAttribute('data-validate')).test(value);
		}
		return true;
	},
	
	// set error classes if needed or remove them
	setErrorClasses: function(el, type) {
		if (el.hasClass('input_error') && this.validateElement(el)) {
			el.removeClass('input_error');
		} else if (this.options.validateOnBlur && !this.validateElement(el)) {
			el.addClass('input_error');
		}
	},
	
	// add validation events to elements
	setValidateElements: function(elements) {
		this.getElements(elements, $$('*[data-validate], *[data-required]')).each(function(el) {
			if (!el.retrieve('validateAdded')) {
				if (el.get('tag') == 'select') {
					el.addEvent('change', function() {
						this.setErrorClasses(el, 'blur');
					}.bind(this));
				}
				el.addEvent('blur', function() {
					this.setErrorClasses(el, 'blur');
				}.bind(this));
				el.store('validateAdded', true);
			}
		}.bind(this));
	},
	
	// get required elements
	getRequired: function(el) {
		return (el.hasAttribute('data-required') && el.value.clean().length == 0);
	},
	
	// set required element classes
	setRequired: function(el) {
		el[this.getRequired(el) ? 'addClass' : 'removeClass']('input_required');
	},
	
	// add events to required elements
	setRequiredElements: function(elements) {
		this.getElements(elements, $$('*[data-required]')).each(function(el) {
			if (el.hasAttribute('data-required')) {
				if (!el.retrieve('requiredAdded')) {
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
		this.getElements(elements, $$('*[data-select]')).each(function(el) {
			if (!el.retrieve('customSelectAdded') && el.get('tag') == 'select') {
				var options = this.getOptionsOfAttribute(el.getAttribute('data-select'));
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
		this.getElements(elements, $$('*[data-number]')).each(function(el) {
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
	reset: function(form) {
		form = $(form) ? $(form) : null;
		if(!form) return false;
		
		form.reset();
		form.getElements('.input_error').each(function(el) { el.removeClass('input_error'); }.bind(this));
		
		this.setRequiredElements();
		this.setPlaceholders();
		
		form.getElements('*[data-select]').each(function(el) {
			el.select(el.value);
		});
		return this;
	}
	
});

// global id for custom placeholders in legacy browser
mForm.customPlaceholderId = 0;

// Initialize mForm
var form;
window.addEvent('domready', function() {
	form = new mForm();
	form.reInit();
});