/*
---
description: Replace your browsers default select field with a more awesome one.

authors: Stephan Wagner

license: MIT-style

requires:
 - mForm
 - mForm.Element
 - core/1.4.5: '*'
 - more/Element.Measure

provides: [mForm.Element.Select]

documentation: http://htmltweaks.com/mForm/Documentation/Element_Select
...
*/

// TODO an optgroup should be open when the selected value is in it

mForm.Element.Select = new Class({
	
	Extends: mForm.Element,
	
	options: {
		original: null,					// element id or element reference of the select field to replace
		
		placeholder: '',				// placeholder for the select field (will add an option with an empty value if the first element of the original select field has a value)
		placeholderSearch:				// placeholder for the search field
			'Search...',
		noSearchResults:				// notice when no search results have been found
			'No options found...',
		noOptions:						// notice when a select field has no options to select
			'There are no options...',
		
		search: 20,						// this many options are neccessary to show the search option (set to true or 0 to always show the search textfield)
		max: 13,						// maximum options to be shown, others will show when scrolling
		maxBuffer: 3,					// only if (max + maxBuffer > options) the options will be hidden and scrolling will be enabled
		focusSearch: false,				// automatically sets the focus on the search field when opening the options
		
		position: 'bottom',				// position of the options container (can be 'top' to show on top of select field or 'bottom' to drop down)
		tween: 'height',				// can be 'opacity' (fade effect) or 'height' (dropdown effect) ('height' works only at position 'bottom')
		autoPosition: true,				// adjusts position if there is not enough space in window to show all options
		windowOffset: 10,				// minimal distance of the options container to the window edges
		
		scrollSpeed: 100,				// scrolling duration for one option
		scrollFast: 30,					// scrolling duration for one option when scrolling fast, e.g. clicking on down or up button
		scrollWheelSpeed: 30,			// scrolling duration for one option when using the mouse wheel		
		scrollWheelStep: 3,				// this many options will be scrolled with one step when using the scroll wheel
		
		dropdownDuration: 250,			// how fast the options menu drops down or tweens back
		fadeDuration: 250,				// how fast the options menu fades when it is opened on top of select field
		
		removeSelected: true,			// if false you wont be able to unselect an option
		
		zIndex: 2000					// the zindex of the select field should be high to make sure it will be above all other absolute elements (and for ie7 debugging)
		
		// Events
		// onOpen: function() {},
		// onClose: function() {}
	},
	
	// initialize
	initialize: function(options) {
		// set options
		this.parent(options);
		
		// return false if original is not a select field
		if (!$(this.options.original) || $(this.options.original).get('tag') != 'select') {
			return false;
		}
		
		// save original element in this
		this.original = $(this.options.original);
		
		// replace functions
		this.original.addClass = this.addClass.bind(this);
		this.original.removeClass = this.removeClass.bind(this);
		
		// use select function for original
		this.original.select = this.select.bind(this);
		
		// set option placeholder if placeholder is set as an attribute in original select
		if (this.original.getAttribute('placeholder') && this.original.getAttribute('placeholder').length > 0) {
			this.options.placeholder = this.original.getAttribute('placeholder');
		}
		
		// add a placeholder option to original if needed
		var first_option;
		if (first_option = this.original.getElement('option')) {
			if (first_option.get('value') == '' && !this.options.placeholder) {
				this.options.placeholder = first_option.get('html');
			} else if (first_option.get('value') != '' && this.options.placeholder) {
				this.original.grab(new Element('option', {
					value: '',
					html: this.options.placeholder
				}), 'top');
			} else if (first_option.get('value') != '' && !this.options.placeholder) {
				this.options.removeSelected = false;
			}
			// check if first option is a real selected value, if not deselect it
			if (first_option.get('value') != null && first_option.get('value') != '' && first_option.get('selected') && this.options.placeholder) {
				this.original.value = '';
			}
		}
		
		// save required in global var
		if (this.original.getAttribute('data-required') != null) {
			this.required = true;
			
			// reset required class if needed
			this.setRequired(this.original);
		}
		
		// set a global usable position var
		this.position = this.options.position;
		
		// set a global zIndex
		this.zIndex = ((this.original.getStyle('zIndex') != 'auto' && this.original.getStyle('zIndex') > 0) ? this.original.getStyle('zIndex') : this.options.zIndex),
		
		// initialize
		this.isOpen = false;
		this.blockScroll = false;
		
		this.construct();
	},
	
	// addClass function
	addClass: function(className) {
		if (!this.original.hasClass(className)) this.original.className = (this.original.className + ' ' + className).clean();
		this.selectContainer ? this.selectContainer.addClass(className) : this.addClasses = className;
		return this.original;
	},
	
	// removeClass function
	removeClass: function(className) {
		this.original.className = this.original.className.replace(new RegExp('(^|\\s)' + className + '(?:\\s|$)'), '$1');
		this.selectContainer ? this.selectContainer.removeClass(className) : '';
		return this.original;
	},
	
	// select function
	select: function(value) {
		this.original.value = value;
		this.selectOption(this.getOption(this.original.value));
		return this.original;
	},
	
	// construct the select field
	construct: function() {
		if (this.selectContainer) return false;
		
		// create select field
		this.selectContainer = new Element('div', {
			'class': 'select ' + (this.original.get('class') || '') + ' ' + (this.addClasses || ''),
			'id': (this.original.get('id') ? this.original.get('id') + '_replacement' : null),
			styles: {
				position: 'relative',
				zIndex: (this.zIndex + 2),
				width: this.original.getStyle('width')
			},
			events: {
				click: function() {
					this.toggle();
				}.bind(this)
			}
		}).inject(this.original, 'after');
		
		if(this.original.hasAttribute('data-required-hidden')) {
			this.selectContainer.setAttribute('data-required-hidden', '');
		}
		
		this.selectValue = new Element('span', {
			html: this.options.placeholder || '&nbsp;',
			styles: {
				display: 'block',
				marginLeft: 1,
				whiteSpace: 'nowrap',
				overflow: 'hidden',
				'-ms-text-overflow': 'ellipsis',
				'-o-text-overflow': 'ellipsis',
				'text-overflow': 'ellipsis'
			}
		}).addClass(this.options.placeholder ? 'select_placeholder' : '').inject(this.selectContainer);
		
		// save constant dimensions in this
		this.dimensions = {};
		this.dimensions.select = this.selectContainer.getDimensions({computeSize: true});
		
		// create selector button
		this.selector = new Element('div', {
			'class': 'select_selector',
			styles: {
				position: 'absolute',
				top: 0,
				right: 0,
				zIndex: (this.zIndex + 3),
				height: (this.dimensions.select.totalHeight - this.dimensions.select['border-top-width'] - this.dimensions.select['border-bottom-width'])
			}
		}).inject(this.selectContainer).grab(new Element('div', {'class': 'select_selector_icon'}));
		
		this.dimensions.selector = this.selector.getDimensions({computeSize: true});
		
		// set width of value container
		this.selectValue.setStyles({width: this.dimensions.select.width - this.dimensions.selector.totalWidth - 0});
		
		// create container
		this.container = new Element('div', {
			'class': 'noselect',
			styles: this.original.getStyles('position', 'top', 'left', 'bottom', 'right', 'float', 'display', 'marginBottom', 'marginLeft', 'marginTop', 'marginRight')
		}).setStyles({
			width: this.dimensions.select.totalWidth,
			height: this.dimensions.select.totalHeight,
			zIndex: this.zIndex
		}).inject(this.selectContainer, 'after').grab(this.selectContainer);
		
		if (this.container.getStyle('position') == 'static') {
			this.container.setStyle('position', 'relative');
		}
		if (this.container.getStyle('display') == 'inline') {
			this.container.setStyle('display', 'block');
		}
		
		// hide original
		this.original.setStyles({
			position: 'absolute',
			top: -12000,
			left: -12000,
			'visibility': 'visible'
		}).addEvents({
			focus: function() {
				this.open();
			}.bind(this)
		});
		
		// create options wrapper
		this.dropdownWrapper = new Element('div', {
			'class': 'select_dropdown_wrapper',
			styles: {
				position: 'absolute',
				top: this.dimensions.select.totalHeight,
				left: 0,
				overflow: 'hidden',
				zIndex: (this.zIndex + 1) // TODO position on top + ?
			}
		}).inject(this.container);
		
		this.dropdownWrapper.setStyle('width', this.dimensions.select.totalWidth - this.dropdownWrapper.getStyle('marginLeft').toInt() - this.dropdownWrapper.getStyle('marginRight').toInt() - this.dropdownWrapper.getStyle('borderRight').toInt() - this.dropdownWrapper.getStyle('borderLeft').toInt());
		
		// create dropdown
		this.dropdown = new Element('div', {
			'class': 'select_dropdown'
		}).inject(this.dropdownWrapper);
		
		this.dropdown.setStyles({
			position: 'absolute',
			bottom: 0,
			margin: 0,
			width: this.dropdownWrapper.getStyle('width')
		});
		
		this.dimensions.dropdown = this.dropdown.getDimensions({computeSize: true});
		
		// create options cantainer
		this.optionsWrapper = new Element('div', {
			'class': 'select_options_wrapper',
			styles: {
				width: this.dimensions.dropdown.width,
				overflow: 'hidden',
				position: 'relative'
			},
			events: {
				mousewheel: function(ev) {
					ev.preventDefault();
					if (!this.blockScroll) {
						this.blockScroll = true;
						var unblockScroll = function() { this.blockScroll = false; };
						unblockScroll.delay(this.options.scrollWheelSpeed * this.options.scrollWheelStep, this);
						ev.wheel < 0 ? this.goto(this.getTopOption(this.options.scrollWheelStep), this.options.scrollWheelSpeed) : this.goto(this.getTopOption(this.options.scrollWheelStep * -1), this.options.scrollWheelSpeed);
					}
				}.bind(this)
			}
		}).inject(this.dropdown);
		
		// create options container
		this.optionsContainer = new Element('div', {
			'class': 'select_options_container',
			styles: {
				position: 'absolute',
				top: 0,
				left: 0
			}
		}).inject(this.optionsWrapper);
		
		// move options in optgroups next to the optgroup
		var optgroup_id = 0;
		this.original.getChildren('optgroup').each(function(el) {
			optgroup_id++;
			el.setAttribute('data-optgroup-id', optgroup_id);
			
			var el3 = null;
			el.getChildren().each(function(el2) {
				el2.setAttribute('data-option-optgroup', 'optgroup' + optgroup_id);
				el2.inject(el3 ? el3 : el, 'after');
				el3 = el2;
			});
		});
		
		// create options
		this.original.getChildren().each(function(el) {	
			if ((el.get('tag') == 'optgroup' && el.get('label') != '') || (el.get('tag') == 'option' && el.get('value') != '' && el.get('html') != '')) {
				
				// create option / optgroup
				var option = new Element('div', {
					'class': 'option select_' + (el.get('tag') == 'optgroup' ? 'optgroup' : 'option') + ' ' + (el.get('class') || ''),
					style: el.get('style')
				}).setStyles({
						position: 'relative',
						whiteSpace: 'nowrap',
						overflow: 'hidden',
						'-ms-text-overflow': 'ellipsis',
						'-o-text-overflow': 'ellipsis',
						'text-overflow': 'ellipsis'
					}).grab(new Element('span', {
					html: (el.get('tag') == 'optgroup' ? (el.get('label') || el.getAttribute('value')) : el.get('html'))
				}));
				
				// set up optgroup
				if (el.get('tag') == 'optgroup') {
					
					option.grab(new Element('div', {
						'class': 'select_optgroup_arrow'
					}));
					
					option.addClass('optgroup_open').setAttribute('data-optgroup-id', el.getAttribute('data-optgroup-id'));
					
					if(el.getAttribute('data-optgroup-closed') != null) {
						option.setAttribute('data-optgroup-closed', '1');
					}
					
					option.addEvent('click', function(ev) {
						
						this.dropdown.getElements('*[data-option-optgroup=optgroup' + option.getAttribute('data-optgroup-id') + ']')
							.setStyle('display', option.hasClass('optgroup_open') ? 'none' : '').toggleClass('option_open');
						
						this.setCurrentOptions();
						
						option.toggleClass('optgroup_open');
						
					}.bind(this)).inject(this.optionsContainer);
				
				// set up option
				} else {
					option.addEvent('click', function(ev) {
						if (ev.target != this.removeSelectedButton) {
							this.selectOption(option);
						}
					}.bind(this)).inject(this.optionsContainer);
					
					if (el.get('selected')) {
						option.addClass('option_selected');
					}
					option.setAttribute('data-option-value', el.value);
					
					if (el.getAttribute('data-option-optgroup')) {
						option.addClass('option_open').setAttribute('data-option-optgroup', el.getAttribute('data-option-optgroup'));
					}
				}
			}
		}.bind(this));
		
		// calculate options numbers and sizes
		this.optionsAmount = {
			all: this.optionsContainer.getChildren('.select_option, .select_optgroup').length
		};
		
		// add notice if there are no options
		if (this.optionsAmount.all == 0) {
			new Element('div', {
				'class': 'select_search_nooptions',
				html: this.options.noOptions
			}).inject(this.optionsWrapper, 'top');
		}
		
		// calculate amounts and dimensions
		this.optionsAmount.visible = (this.optionsAmount.all <= this.options.max) ? this.optionsAmount.all : ((this.optionsAmount.all - this.options.max <= this.options.maxBuffer) ? this.options.max + (this.optionlist.length - this.options.max) : this.optionsAmount.visible = this.options.max);
		this.setCurrentOptions();

		this.dimensions.option = this.optionsContainer.getFirst('.select_option, .select_optgroup') ? this.optionsContainer.getFirst('.select_option').getDimensions({computeSize: true, styles: ['padding', 'border', 'margin']}) : {};
		this.dimensions.optionSpan = this.optionsContainer.getFirst('.select_option span') ? this.optionsContainer.getFirst('.select_option span').getDimensions({computeSize: true, styles: ['padding', 'border', 'margin']}) : {};
		
		// close optgroups
		this.dropdown.getElements('*[data-optgroup-closed]').fireEvent('click');
		
		// add the remove option button
		this.selectOption(this.getSelected(), false);
		
		// set height of options wrapper / container
		this.optionsWrapper.setStyles({height: (this.optionsAmount.visible * this.dimensions.option.totalHeight)});
		this.dimensions.optionsWrapper = this.optionsWrapper.getDimensions({computeSize: true, styles: ['margin', 'padding', 'border']});
		
		this.optionsContainer.setStyles({
			width: this.dimensions.optionsWrapper.width,
			height: this.optionsAmount.all * this.dimensions.option.totalHeight
		});
		
		// set heights of buttons and search to 0
		this.dimensions.moveUp = this.dimensions.moveDown = this.dimensions.searchContainer = this.dimensions.search = {
			height: 0,
			totalHeight: 0
		};
		
		// create move up / move down buttons
		if (this.optionsAmount.visible < this.optionsAmount.all) {
			this.dropdownWrapper.addClass('select_is_scrollable');
			
			this.moveUp = new Element('div', {
				'class': 'select_move_up',
				events: {
					mousedown:  function() { this.goto('first', this.options.scrollFast); }.bind(this),
					mouseup:    function() { this.goto('first', this.options.scrollSpeed); }.bind(this),
					mouseenter: function() { this.goto('first', this.options.scrollSpeed); }.bind(this),
					mouseleave: function() { this.stop('up'); }.bind(this)
				}
			}).inject(this.dropdown, 'top').grab(new Element('div', {'class': 'select_move_up_icon'}));
			
			this.dimensions.moveUp = this.moveUp.getDimensions({computeSize: true});
			
			this.moveDown = new Element('div', {
				'class': 'select_move_down',
				events: {
					mousedown:  function() { this.goto('last', this.options.scrollFast); }.bind(this),
					mouseup:    function() { this.goto('last', this.options.scrollSpeed); }.bind(this),
					mouseenter: function() { this.goto('last', this.options.scrollSpeed); }.bind(this),
					mouseleave: function() { this.stop('down'); }.bind(this)
				}
			}).inject(this.dropdown).grab(new Element('div', {'class': 'select_move_down_icon'}));
			
			this.dimensions.moveDown = this.moveDown.getDimensions({computeSize: true});
		}
		
		// create search
		if (this.options.search != false && (this.options.search == true || this.options.search.toInt() <= this.optionsAmount.all)) {
			this.search = new Element('input', {
				type: 'text',
				'class': 'select_search',
				'data-blocksubmit': true,
				spellcheck: false,
				maxlength: 30,
				placeholder: this.options.placeholderSearch,
				events: {
					keyup: function(ev) {
						if (!ev || ev.key != 'enter' && ev.key != 'up' && ev.key != 'down') {
							this.goto(1, 0);
							var value = this.search.value;
							var pattern = new RegExp(value, "i");
							this.optionsContainer.getChildren().each(function(el) {
								var el_test = pattern.test(el.get('html').replace(/(<([^>]+)>)/ig,""));
								if ((value != '' && (el.hasClass('select_optgroup') || !el_test)) || (value == '' && el.hasAttribute('data-option-optgroup') && !el.hasClass('option_open'))) {
									el.setStyle('display', 'none');
								} else if((value != '' && el_test) || (value == '' && (!el.hasAttribute('data-option-optgroup') || el.hasClass('option_open') || el.hasClass('select_optgroup')))) {
									el.setStyle('display', '');
								}
							}.bind(this));
							
							this.searchCancel[(this.search.value != '') ? 'addClass' : 'removeClass']('select_search_cancel_active');
							
							this.setCurrentOptions();
							
							if (this.optionsAmount.current == 0) {
								this.noSearchResults ?
									this.noSearchResults.setStyle('display', '') :
									this.noSearchResults = new Element('div', {
										'class': 'select_search_noresults',
										html: this.options.noSearchResults,
										styles: {
											position: 'absolute',
											top: 0,
											left: 0
										}
									}).inject(this.optionsWrapper, 'top');
							} else {
								this.noSearchResults ? this.noSearchResults.setStyle('display', 'none') : null;
							}
							this.preselect(this.getFirstVisible(), true);
						}
					}.bind(this)
				}
			});
			
			// create search container
			this.searchContainer = new Element('div', {
				'class': 'select_search_container',
				styles: {
					position: 'relative'
				}
			}).grab(this.search).inject(this.optionsWrapper, 'before');
			
			this.dimensions.search = this.search.getDimensions({computeSize: true});
			this.dimensions.searchContainer = this.searchContainer.getDimensions({computeSize: true});
			
			// set width of search field
			this.search.setStyle('width', (this.dimensions.searchContainer.width - this.dimensions.search.computedLeft - this.dimensions.search.computedRight));
			
			// create cancel search button
			this.searchCancel = new Element('div', {
				'class': 'select_search_cancel',
				styles: {
					width: this.dimensions.search.totalHeight,
					height: this.dimensions.search.totalHeight,
					position: 'absolute',
					right: this.dimensions.searchContainer['padding-right'],
					zIndex: (this.zIndex + 4)
				},
				events: {
					click: function() {
						if (this.search.value.length != 0) {
							this.search.value = '';
							this.search.fireEvent('keyup');
						}
					}.bind(this)
				}
			}).inject(this.searchContainer, 'top');
		}
		
		// set dropdown height considering buttons and search
		this.dimensions.dropdown.height = this.dimensions.dropdown.totalHeight = this.dimensions.optionsWrapper.totalHeight + this.dimensions.moveUp.totalHeight + this.dimensions.moveDown.totalHeight + this.dimensions.searchContainer.totalHeight;
		this.dropdown.setStyle('height', this.dimensions.dropdown.totalHeight);
		
		// hide dropdown
		this.dropdownWrapper.setStyles({
			opacity: 0,
			height: 0
		});
	},
	
	// scroll options to top and unselect the preselected
	resetOptions: function() {
		if (this.searchCancel) {
			this.searchCancel.fireEvent('click');
		}
		this.removePreselected();
		this.goto('first', 0);
	},
	
	// preselect an option so you can select it by pressing enter
	preselect: function(el, move_to_preselected) {
		if ($(el)) {
			this.removePreselected();
			$(el).addClass('option_preselected');
			
			if (move_to_preselected) {
				this.goto(this.getOptionPosition($(el)) - (this.optionsAmount.visible / 2).floor(), 0);
			}
		}
		return $(el);
	},
	
	// removes the preselected status of the currently preselected element
	removePreselected: function() {
		if (this.optionsContainer.getFirst('.option_preselected')) {
			this.optionsContainer.getElements('.option_preselected').removeClass('option_preselected');
		}
		return this;
	},
	
	// removes the selected status of the currently selected element
	removeSelected: function() {
		if (this.optionsContainer.getFirst('.option_selected')) {
			this.optionsContainer.getElements('.option_selected').removeClass('option_selected').removeClass('has_remove_selected');
			
			if (this.required) {
				this.setRequired(this.original);
			}
			this.original.fireEvent('change');
		}
		return this;
	},
	
	// set the wrapper postion to possible position
	setDropdownPosition: function() {
		
		var select_coordinates = this.selectContainer.getCoordinates();
		var window_dimensions = $(window).getSize();
		var window_scroll_dimensions = $(window).getScrollSize();
		var window_scroll = $(window).getScroll();
		
		var max_top = select_coordinates.top - this.options.windowOffset - window_scroll.y;
		var max_bottom = window_dimensions.y - select_coordinates.top - window_scroll.y - this.options.windowOffset - this.dimensions.select.totalHeight;
		
		var offset_top = this.dimensions.moveUp.totalHeight + this.dimensions.searchContainer.totalHeight + this.optionsWrapper.getStyle('marginTop').toInt();
		var offset_bottom = this.dimensions.moveDown.totalHeight + this.optionsWrapper.getStyle('marginBottom').toInt();
		
		if (this.options.position == 'top' || (this.options.autoPosition && max_bottom < this.dimensions.dropdown.totalHeight && max_top > offset_top)) {
			this.position = 'top';
			this.dropdownWrapper.removeClass('select_position_bottom');
			this.dropdownWrapper.setStyle('zIndex', this.zIndex + 4);
			
			for(var i = 0; i < (this.optionsAmount.visible - 1); i++) {
				if (max_bottom < this.dimensions.dropdown.totalHeight - offset_top - this.dimensions.option.totalHeight && max_top > offset_top + this.dimensions.option.totalHeight) {
					offset_top += this.dimensions.option.totalHeight;
				} else {
					break;
				}
			}
			this.dropdownWrapper.setStyle('top', (offset_top * (-1)));
		} else {
			this.position = 'bottom';
			this.dropdownWrapper.addClass('select_position_bottom');
			this.dropdownWrapper.setStyle('zIndex', this.zIndex + 1);
			this.dropdownWrapper.setStyle('top', this.dimensions.select.totalHeight);
		}
	},
	
	// set the current amount of visible options
	setCurrentOptions: function() {
		var current_options = 0;
		this.optionsContainer.getChildren('.select_option, .select_optgroup').each(function(el) {
			if (el.getStyle('display') != 'none') {
				current_options++;
			}
		});
		this.optionsAmount.current = current_options;
	},
	
	// returns the element-instance of the currently preselected option
	getCurrentPreselected: function() {
		return this.optionsContainer.getFirst('.option_preselected');
	},
	
	// returns the element-instance of the first visible option
	getFirstVisible: function() {
		var option_found = null;
		this.optionsContainer.getChildren('.select_option').each(function(el) {
			if (el.getStyle('display') != 'none' && option_found == null) { option_found = el; }
		});
		return option_found;
	},
	
	// returns the element-instance of the next visible option relative to option
	getNextVisible: function(option, prev) {
		option = option || this.getCurrentPreselected();
		if (!option) return this.getFirstVisible();
		var option_found = null;
		option[prev ? 'getAllPrevious' : 'getAllNext']('.select_option').each(function(el) {
			if (el.getStyle('display') != 'none' && option_found == null) { option_found = el; }
		});
		return option_found;
	},
	
	// returns the element-instance of the previous visible option relative to el
	getPreviousVisible: function(option) {
		return this.getNextVisible(option, true);
	},
	
	// return the option element from a given value
	getOption: function(value) {
		return this.optionsContainer.getFirst('*[data-option-value=' + value + ']');
	},
	
	// returns the position of an visible option of an element instance
	getOptionPosition: function(option) {
		if (!option || option.getStyle('display') == 'none') return null;
		var option_found = 1;
		option.getAllPrevious().each(function(el) {
			if (el.getStyle('display') != 'none') { option_found++; }
		});
		return option_found;
	},
	
	// returns the offset of the top option
	getOptionsOffset: function() {
		return (this.optionsContainer.getStyle('top').toInt() * (-1)) - ((this.optionsContainer.getStyle('top').toInt() * (-1) / this.dimensions.option.totalHeight).floor() * this.dimensions.option.totalHeight);
	},
	
	// returns the number of the first option
	getTopOption: function(add) {
		return (this.optionsContainer.getStyle('top').toInt() * (-1) / this.dimensions.option.totalHeight).floor() + 1 + (add ? add : 0);
	},
	
	// get last possible option to scroll to
	getLastScrollOption: function() {
		var last_option = this.optionsAmount.current - this.optionsAmount.visible + 1;
		return last_option < 1 ? 1 : last_option;
	},
	
	// returns the possible option to scroll to
	getPossibleScrollOption: function(option) {
		return (option < 1) ? 1 : (option > this.getLastScrollOption() ? this.getLastScrollOption() : option);
	},
	
	// returns the option to scroll to
	getScrollOption: function(option) {
		return this.getPossibleScrollOption((option == 'first') ? 1 : (option == 'last' ? this.optionsAmount.current : option.toInt()));
	},
	
	// returns the top position to scroll to
	getScrollPosition: function(option) {
		return (this.getScrollOption(option) - 1) * this.dimensions.option.totalHeight * (-1);
	},
	
	// returns the scroll duration for an option
	getScrollDuration: function(option, speed) {
		var duration = (this.getScrollPosition(option) - this.optionsContainer.getStyle('top').toInt()) / this.dimensions.option.totalHeight;
		return !speed ? 0 : (duration * (duration < 0 ? (-1) : 1) * speed);
	},
	
	// returns the currently selected option
	getSelected: function() {
		return this.optionsContainer.getFirst('.option_selected');
	},
	
	// selects the given element or the currently preselected element
	selectOption: function(option, fireChangeEvent) {
		option = $(option) || this.getCurrentPreselected();
		if (option) {
			this.selectValue.set('html', option.get('html')).removeClass('select_placeholder');
			this.removeSelected();
			this.removePreselected();
			this.preselect(option);
			option.addClass('option_selected');
			if (this.options.removeSelected) {
				option.addClass('has_remove_selected');
			}
			this.addRemoveSelected(option);
			this.original.value = option.getAttribute('data-option-value');
			
			if (this.required) {
				this.setRequired(this.original);
			}
			if(fireChangeEvent != false) {
				this.original.fireEvent('change');
			}
			this.close();
		} else if(this.removeSelectedButton) {
			this.removeSelectedButton.fireEvent('click');
		}
		return this;
	},
	
	// add the remove button for selected elements
	addRemoveSelected: function(option) {
		if (option && this.options.removeSelected) {
			if (!this.removeSelectedButton) {
				this.removeSelectedButton = new Element('div', {
					'class': 'remove_selected',
					styles: {
						position:'absolute',
						top: 0,
						right: this.dimensions.optionSpan['margin-right']
					},
					events: {
						click: function() {
							this.original.value = '';
							this.selectValue.set('html', this.options.placeholder || '&nbsp;').addClass(this.options.placeholder ? 'select_placeholder' : '');
							this.removeSelected().removePreselected().resetOptions();
							this.close();
						}.bind(this)
					}
				}).inject(option, 'bottom');
				
				this.removeSelectedButton.setStyles({
					height: (this.dimensions.option.totalHeight - this.dimensions.option['border-top-width'] - this.dimensions.option['border-bottom-width']),
					width: (this.dimensions.option.totalHeight - this.dimensions.option['border-left-width'] - this.dimensions.option['border-right-width'])
				});
			} else {
				this.removeSelectedButton.inject(option, 'bottom');
			}
		}
		return this;
	},
	
	// scroll to an option
	goto: function(option, speed, adjust) {
		this.stop();
		var duration = this.getScrollDuration(option, speed);
		var tween_to = this.getScrollPosition(option);
		this.optionsContainer.set('tween', {
			property: 'top',
			duration: duration,
			transition: 'linear',
			onComplete: function() {
				this.stop(adjust);
			}
		});
		this.optionsContainer.tween(tween_to);
		return this;
	},
	
	// stop the scolling
	stop: function(adjust) {
		this.optionsContainer.get('tween').cancel();
		if (adjust && this.getOptionsOffset() > 0) {
			var tween_to = this.getScrollPosition(this.getTopOption(adjust == 'down' ? 1 : 0));
			this.optionsContainer.set('tween', {
				property: 'top',
				duration: 400,
				transition: 'sine:out'
			}).tween(tween_to);
		}
		return this;
	},
	
	// show options, set focus to select field
	open: function() {
		if (!this.isOpen) {
			this.isOpen = true;
			this.selectContainer.addClass('select_focus');
			this.container.setStyle('zIndex', (this.zIndex + 10));
			
			this.attachEvents();
			this.preselect(this.getSelected(), true);
			
			this.dropdownWrapper.setStyle('display', '');
			
			if(this.options.focusSearch && this.search) {
				this.search.focus();
			}
			this.setDropdownPosition();
			
			this.fireEvent('open');
			
			if (this.transition) { this.transition.cancel(); }
			
			var fade = (this.position == 'top' || this.options.tween == 'opacity');
			
			fade ?
			this.dropdownWrapper.setStyle('height', this.dimensions.dropdown.totalHeight) :
			this.dropdownWrapper.setStyle('opacity', 1);
			
			this.transition = new Fx.Tween(this.dropdownWrapper, {
   				property: (fade ? 'opacity' : 'height'),
   				duration: (fade ? this.options.fadeDuration : this.options.dropdownDuration),
    			link: 'cancel'
    		}).start((fade ? 1 : this.dimensions.dropdown.totalHeight));
    		
		}
		return this;
	},
	
	// hide options, remove focus on select field
	close: function() {
		if (this.isOpen) {
			this.isOpen = false;
			this.selectContainer.removeClass('select_focus');
			this.container.setStyle('zIndex', (this.zIndex + 5));
			
			this.detachEvents();
			
			var complete = function() {
				this.resetOptions();
				this.container.setStyle('zIndex', this.zIndex);
				this.dropdownWrapper.setStyles({
					opacity: 0,
					height: 0,
					display: 'none'
				});
			}.bind(this);
			
			this.fireEvent('close');
			
			if (this.transition) { this.transition.cancel(); }
			
			var fade = (this.position == 'top' || this.options.tween == 'opacity');
			
			this.transition = new Fx.Tween(this.dropdownWrapper, {
   				property: (fade ? 'opacity' : 'height'),
   				duration: (fade ? this.options.fadeDuration : this.options.dropdownDuration),
   				link: 'cancel',
   				onComplete: complete
   			}).start(0);
    		
		}
		return this;
	},
	
	// attach events to document
	attachEvents: function() {
		this.bodyKeydownEvent = function(ev) {
			if (ev.key == 'up' || ev.key == 'down') {
				ev.preventDefault();
				this.preselect(this[ev.key == 'up' ? 'getPreviousVisible' : 'getNextVisible'](), true);
			} else if (ev.key == 'enter') {
				ev.preventDefault();
				this.selectOption(this.getCurrentPreselected());
			} else if (ev.key == 'esc') {
				this.close();
			} else if (ev.key == 'tab') {
				ev.preventDefault();
				this.close();
				this.getNextInput().focus()
			}
		}.bind(this);
		$(document).addEvent('keydown', this.bodyKeydownEvent);
		
		this.bodyClickEvent = function(ev) { if (this.isOpen && ev.target != this.container && !this.container.contains(ev.target)) { this.close(); } }.bind(this);
		$(document).addEvent('click', this.bodyClickEvent);
		
		this.resizeEvent = function() { this.setDropdownPosition(); }.bind(this);
		if (this.options.autoPosition) {
			$(window).addEvent('resize', this.resizeEvent);
			$(window).addEvent('scroll', this.resizeEvent);
		}
	},
	
	// remove Events from document
	detachEvents: function() {
		$(document).removeEvent('click', this.bodyClickEvent);
		$(document).removeEvent('keydown', this.bodyKeydownEvent);
		$(window).removeEvent('resize', this.resizeEvent);
	},
	
	// toggle options
	toggle: function() {
		return this[this.isOpen ? 'close' : 'open']();
	},
	
	// get the next availible input field we can set focus to
	getNextInput: function() {
		if (this.nextInput) return this.nextInput;
		$(document).getElements('select, input, textarea, button').each(function(el, index, obj) {
			if (el == this.original) {
				if (index < obj.length - this.search ? 2 : 1) {
					this.nextInput = obj[(index + (this.search ? 2 : 1))];
				} else if (obj.length > this.search ? 2 : 1) {
					this.nextInput = obj[0];
				}
			}
		}.bind(this));
		return this.nextInput = this.nextInput || $(document);
	}
	
});