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

documentation: http://www.htmltweaks.com/mForm/Documentation/Submit
...
*/

mForm.Submit = new Class({
	
	Implements: [Options, Events, mForm],
	
	options: {
		
		form: null, 				// id or element instance of the form to add submit events
		
		ajax: true,					// sets the ajax-request functions for the form
		
		disable: true, 				// disable all buttons when a form is submitted
		disableButtons: null, 		// extra buttons to be disabled
		
		overlay: true, 				// adds a overlay to document when submitting a form to prevent clicks on body	
			
		loading: true,				// set loading events to buttons
		loadingButton: null,		// the button (id or element instance) which shows the loading spinner (defaults to last submit button of the form)

		captcha: '', 				// this value will be sent in a hidden field only when the user made any action in the form
		timer: 5000,				// after mForm.Submit is initialized you have to wait this long (in ms) to submit the form
		
		validate: true,				// checks if all the field having the requiredClass have an value, if not errors will be shown
		blinkErrors: true,			// error fields will blink
		bounceSubmitButton: true,	// the submit button will bounce left to right when validation failed
		
		responseError: 0,			// the response value to fire the error event ('any' can be any value except responseSuccess value)
		responseSuccess: 1 			// the response value to fire the success event ('any' can be any value except responseError value)
		
		// Events
		// onResponseSuccess: function(response) {}
		// onResponseError: function(response) {}
		// onShowError: function(elements) {}
	},
	
	// initialize
	initialize: function(options) {
		this.blockSubmit = false;	// set to true so the form cant be submitted
		
		// set options
		this.setOptions(options);
		
		// set this.form if this.options.form is a valid form, otherwise return false
		if($(this.options.form) && $(this.options.form).get('tag') == 'form') {
			this.form = $(this.options.form);
		} else {
			return false;
		}
		
		// set timer
		if(this.options.timer > 0) {
			this.setTimer();
		}
		
		// set send events
		if(this.options.ajax) {
			this.setAjax();
		}
		
		// set submit events
		this.setSubmit();
		
		// set captcha events
		if(this.options.captcha != '') {
			this.captcha(this.options.captcha);
		}
		
	},
	
	// set timer to block submitting the form
	setTimer: function() {
		var setBlockSubmit = function() {
			this.blockSubmit = false;
		}
		if (this.options.timer > 0) {
			this.blockSubmit = true;
			setBlockSubmit.delay(this.options.timer, this);
		}
	},
	
	// set the send events
	setAjax: function() {
		this.form.set('send', {
			onRequest: function() {
				if(this.options.disable) {
					this.disable(this.options.disableButtons);
				}
				if(this.options.loading) {
					this.startLoading(this.options.loadingButton);
				}
				if(this.options.overlay) {
					this.addOverlay();
				}
				this.fireEvent('request');
			}.bind(this),
			
			onComplete: function(response) {
				if(this.options.disable) {
					this.enable(this.options.disableButtons);
				}
				if(this.options.loading) {
					this.stopLoading(this.options.loadingButton);
				}
				if(this.options.overlay) {
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
				this.fireEvent('failure', [event, xhr]);
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
			// TODO set blockSubmit to false onRequest and to true onComplete, instead of diabling all buttons
			var submit_form = true;
			if (this.$events.submit) {
				this.$events.submit.each(function(fn) {
					if (fn.apply(this) == false) {
						submit_form = false;
					}
					return false;
				}.bind(this));
			}
			if (submit_form) {
				if ((!this.options.validate || this.validate()) && !this.blockSubmit) {
					this.form[this.options.ajax ? 'send' : 'submit']();
				}
			}
			if (ev) {
				ev.preventDefault();
			}
			return false;
		}.bind(this));
		return this;
	},
	
	// add captcha events
	captcha: function(captcha) {
		var captchaEvent = function() {
			if(!this.captchaEventAdded) {
				if(!this.form.getFirst('.captchaValue')) {
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
		
		this.form.getElements('input, textarea, select').each(function(el) {
			if(!el.retrieve('captchaEventAdded')) {
				el.addEvents({
					focus: captchaEvent
				});
				el.store('captchaEventAdded', true);
			}
		});
		return this;
	},
	
	// add validate events
	validate: function(elements) {
		
		// TODO scroll to first visible error if error occured (or send message)
		// TODO you probably have to check required fields here as they wont trigger when you do el.value = el;
		
		this.showErrors(this.form.getElements('.required'), this.options.bounceSubmitButton);
		return this.form.getElements('.required').length > 0 ? false : true;
	},
	
	// show errors
	showErrors: function(elements, bounceButton) {
		if($(elements)) {
			elements = Array.from($(elements));
		}
		elements = $$(elements);
		
		if(elements.length > 0) {
			this.fireEvent('showErrors', elements);
			
			elements.each(function(el) {
				el.addClass(this.options.requiredElements.errorClass);
				
				if(this.options.blinkErrors) {
					var blinkErrors = function(el, fn) {
						el[fn + 'Class'](this.options.requiredElements.errorClass);
					}.bind(this);
					blinkErrors.delay(50, null, [elements, 'remove']);
					blinkErrors.delay(150, null, [elements, 'add']);
					blinkErrors.delay(200, null, [elements, 'remove']);
					blinkErrors.delay(300, null, [elements, 'add']);
				}
			}.bind(this));
			
			if(bounceButton) {
				// TODO check submit button on initialize
				var submit_button = this.form.getElements('button[type=submit], input[type=submit]').getLast();
				
				submit_button_fx = new Fx.Tween(submit_button, {
					duration: 30,
					transition: 'linear',
					property: 'marginLeft'
				});
				
				var margin_original = submit_button.getStyle('marginLeft').toInt() || 0;
				
				submit_button_fx.start(margin_original, margin_original + 10).chain(function() {
					submit_button_fx.start(margin_original + 10, margin_original);
				}).chain(function() {
					submit_button_fx.start(margin_original, margin_original - 10);
				}).chain(function() {
					submit_button_fx.start(margin_original - 10, margin_original);
				}).chain(function() {
					submit_button_fx.start(margin_original, margin_original + 10);
				}).chain(function() {
					submit_button_fx.start(margin_original + 10, margin_original);
				});
			}
		}
		return this;
	},

	
	// start loading a form
	startLoading: function(loadingButton, stop) {
		loadingButton = $(loadingButton) || this.form.getElements('button[type=submit], input[type=submit]').getLast();
		$(loadingButton) ? $(loadingButton)[stop ? 'removeClass' : 'addClass']('button_loading') : null;
		return this;
	},
	
	// stop loading a form
	stopLoading: function(loadingButton) {
		return this.startLoading(loadingButton, true);
	},
	
	// enable form buttons
	enable: function(buttons, disable) {
		buttons = this.form.getElements('button, input[type=submit], input[type=button]').combine($$(buttons)).combine(Array.from($(buttons))).combine($$('.' + buttons)).clean();
		if(buttons.length > 0) {
			buttons.set('disabled', disable ? true : false);
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
					zIndex: (zIndex || 100000),
					background: '#ffffff',
					opacity: 0.0001
				}
			}).inject($(document.body), 'bottom');
		}
		return this;
	},
	
	// remove overlay
	removeOverlay: function() {
		if(this.overlay) {
			this.overlay.dispose();
			this.overlay = null;
		}
		return this;
	}
});