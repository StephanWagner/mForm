/*
---
description: This class makes submitting your forms, especially your ajax forms, nicer and easier.

authors: Stephan Wagner

license: MIT-style

requires:
 - mForm
 - core/1.4.5: '*'
 - more/Element.Measure

provides: [mForm.Submit]

documentation: http://htmltweaks.com/mForm/Documentation/Submit
...
*/

mForm.Submit = new Class({
	
	Implements: [Options, Events, mForm],
	
	options: {
		
		form: null, 				// id or element instance of the form to add submit events
		ajax: true,					// the form will be submittes with an ajax request
		
		disableFormOnSubmit: true,  // disable all buttons when a form is submitted
		disableButtons: null, 		// extra buttons to be disabled
		
		addOverlay: true, 			// adds a overlay to the document when submitting a form to prevent clicks on body	
		showLoader: true,			// adds a loading symbol to the submit button when ajax request is loading
		
		captcha: '', 				// this value will be sent in a hidden field once a user made an action in the form (e.g. focus a element)
		timer: 0,					// after mForm.Submit is initialized you have to wait this long (in ms) to submit the form
									// timerCountdown: true TODO mark button with seconds
		
		submitButton: null,			// the default submit button of the form (defaults to last button with type = submit)
		
		validateOnBlur: false,		// true will validate elements of this form when they loose focus (onBlur)
		validateOnSubmit: true,		// validates the form elements when the form is submitted
		blinkErrors: true,			// when validation fails, the error-elements will blink
		
		shakeSubmitButton: true,	// when validation fails, submitButton will shake
		shakeElement: null,			// the element to use the shake effect on
		shakeWidth: 15,				// the width to shake the element
		
		responseError: 0,			// the response value to fire the error event ('any' can be any value except responseSuccess value)
		responseSuccess: 1 			// the response value to fire the success event ('any' can be any value except responseError value)
		
		// Events
		// onResponseSuccess: function(response) {}
		// onResponseError: function(response) {}
		// onShowError: function(elements) {}
	},
	
	// initialize
	initialize: function(options) {
		this.blockSubmit = false;	// set this.blockSubmit anytime to true so the form can't be submitted
		
		// set options
		this.setOptions(options);
		
		// set this.form if this.options.form is a valid form, otherwise exit
		if($(this.options.form) && $(this.options.form).get('tag') == 'form') {
			this.form = $(this.options.form);
		} else {
			return false;
		}
		
		// set send events
		if(this.options.ajax) this.setAjax();
		
		// set validate events of this form
		if(this.options.validateOnSubmit) this.setValidateElements(this.form.getElements('*[data-validate], *[data-required]'));
		
		// set submit events
		this.setSubmit();
		
		// set captcha events
		if(this.options.captcha != '') this.captcha(this.options.captcha);
		
		// set timer if needed
		if(this.options.timer > 0) this.setTimer();
		
		// get the submit-button
		this.submitButton = $(this.options.submitButton) || this.form.getElements('button[type=submit], input[type=submit]').getLast();
	},
	
	// set timer to block submitting the form
	setTimer: function() {
		var setBlockSubmit = function() { this.blockSubmit = false; }
		this.blockSubmit = true;
		setBlockSubmit.delay(this.options.timer, this);
	},
	
	// set the send events
	setAjax: function() {
		this.form.set('send', {
			onRequest: function() {
				if(this.options.disableFormOnSubmit) {
					this.disable(this.options.disableButtons);
				}
				if(this.options.showLoader) {
					this.startLoading(this.submitButton);
				}
				if(this.options.addOverlay) {
					this.addOverlay();
				}
				this.fireEvent('request');
			}.bind(this),
			
			onComplete: function(response) {
				if(this.options.disableFormOnSubmit) {
					this.enable(this.options.disableButtons);
				}
				if(this.options.showLoader) {
					this.stopLoading(this.options.submitButton);
				}
				if(this.options.addOverlay) {
					this.removeOverlay();
				}
				this.fireEvent('complete', response);
				
				if(response == this.options.responseSuccess || (this.options.responseSuccess == 'any' && response != this.options.responseError)) {
					this.fireEvent('responseSuccess', response);
				}
				if(response == this.options.responseError || (this.options.responseError == 'any' && response != this.options.responseSuccess)) {
					this.fireEvent('responseError', response);
				}
			}.bind(this),
			onLoadstart: function(event, xhr) {
				this.fireEvent('loadstart', [event, xhr]);
			}.bind(this),
			onFailure: function(xhr) {
				this.fireEvent('failure', xhr);
			}.bind(this),
			onProgress: function(event, xhr) {
				this.fireEvent('progress', [event, xhr]);
			}.bind(this),
			onException: function(headerName, value) {
				this.fireEvent('exception', [headerName, value]);
			}.bind(this),
			onSuccess: function(responseText, responseXML) {
				this.fireEvent('success', [responseText, responseXML]);
			}.bind(this)
		});
	},
	
	// set submit functions
	setSubmit: function() {
		this.form.addEvent('submit', function(ev) {
			var submit_form = true;
			if (this.$events.submit) {
				this.$events.submit.each(function(fn) {
					if (fn.apply(this) == false) {
						submit_form = false;
					}
					return false;
				}.bind(this));
			}
			if (submit_form && !this.blockSubmit && this.validate()) {
				this.form[this.options.ajax ? 'send' : 'submit']();
			}
			ev ? ev.preventDefault() : null;
			return false;
		}.bind(this));
	},
	
	// add captcha events
	captcha: function(captcha) {
		var captchaEvent = function() {
			if (!this.captchaEventAdded) {
				if (!this.form.getFirst('.captchaValue')) {
					this.captcha = new Element('input', {
						type: 'hidden',
						name: 'captcha',
						'class': 'captchaValue'
					}).inject(this.form);
				}
				this.captcha.value = captcha;
				this.captchaEventAdded = true;
			}
		}.bind(this);
		
		this.form.getElements('input, textarea, select, checkbox').each(function(el) {
			if (!el.retrieve('captchaEventAdded')) {
				el.addEvents({
					focus: captchaEvent
				});
				el.store('captchaEventAdded', true);
			}
		});
	},
	
	// add validate events
	validate: function(elements) {
		if (!this.options.validateOnSubmit) {
			return true;
		}
		var errorElements = [];
		
		// get elements to validate
		this.getElements(elements, this.form.getElements('*[data-validate], *[data-required]')).each(function(el) {
			if (!this.validateElement(el)) {
				errorElements.push(el);
			}
		}.bind(this));
		
		this.showErrors(errorElements, this.options.shakeSubmitButton, this.options.shakeElement);
		
		return (errorElements.length == 0);
	},
	
	// function to show errors
	showErrors: function(elements, shakeButton, shakeElement) {
		if ($(elements)) {
			elements = Array.from($(elements));
		}
		elements = $$(elements);
		
		shakeElement = $(shakeElement) || this.submitButton;
		
		if (elements.length > 0) {
			this.fireEvent('showErrors', elements);
			
			elements.each(function(el) {
				el.addClass('input_error');
				
				if(this.options.blinkErrors) {
					var blinkErrors = function(el, fn) {
						el[fn + 'Class']('input_error');
					}.bind(this);
					
					[50, 150, 200, 300].each(function(value, index) {
						blinkErrors.delay(value, null, [elements, index % 2 == 0 ? 'remove' : 'add']);
					});
				}
			}.bind(this));
			
			if (shakeButton && shakeElement) {
				if (!shakeElement.retrieve('shakeEffectAdded')) {
					var margin_original = shakeElement.getStyle('marginLeft').toInt() || 0;
					
					shakeElement.set('tween', {
						property: 'marginLeft',
						link: 'cancel',
						duration: 350,
						transition: function(p, x) {
							return Math.asin(Math.sin(p * 4 * Math.PI)) * 2 / Math.PI;      
						},
						onStart: function() {
							this.blockSubmit = true;
						}.bind(this),
						onComplete: function() {
							this.blockSubmit = false;
							shakeElement.setStyle('marginLeft', margin_original);
						}.bind(this)
					}).store('shakeEffectAdded');
				}
				shakeElement.tween(this.options.shakeWidth);
			}
		}
		return this;
	},
	
	// show the loading spinner
	startLoading: function(loadingButton, stop) {
		loadingButton = $(loadingButton) || this.form.getElements('button[type=submit], input[type=submit]').getLast();
		$(loadingButton) ? $(loadingButton)[stop ? 'removeClass' : 'addClass']('button_loading') : null;
		return this;
	},
	
	// remove the loading spinner
	stopLoading: function(loadingButton) {
		return this.startLoading(loadingButton, true);
	},
	
	// enable form buttons
	enable: function(buttons, disable) {
		var all_buttons = this.form.getElements('button, input[type=submit], input[type=button]');
		all_buttons = buttons ? all_buttons.combine($$(buttons)).combine(Array.from($(buttons))).clean() : all_buttons;
		if(all_buttons.length > 0) {
			all_buttons.set('disabled', disable ? true : false);
		}
		return this;
	},
	
	// disable form buttons
	disable: function(buttons) {
		return this.enable(buttons, true);
	},
	
	// add a overlay to prevent clicks while loading
	addOverlay: function(zIndex) {
		if(!this.overlay) {
			this.overlay = new Element('div', {
				styles: {
					position: 'absolute',
					top: 0,
					left: 0,
					width: $(window).getScrollSize().x,
					height: $(window).getScrollSize().y,
					zIndex: (zIndex || 1000000),
					background: '#ffffff',
					opacity: 0.00001
				}
			}).inject($(document.body), 'bottom');
		}
		return this;
	},
	
	// remove overlay
	removeOverlay: function() {
		if(this.overlay) {
			this.overlay.destroy();
			this.overlay = null;
		}
		return this;
	}
});