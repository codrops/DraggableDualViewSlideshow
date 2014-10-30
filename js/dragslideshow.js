/**
 * dragslideshow.js v1.0.0
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2014, Codrops
 * http://www.codrops.com
 */
;( function( window ) {
	
	'use strict';
	
	var docElem = window.document.documentElement,
		transEndEventNames = {
			'WebkitTransition': 'webkitTransitionEnd',
			'MozTransition': 'transitionend',
			'OTransition': 'oTransitionEnd',
			'msTransition': 'MSTransitionEnd',
			'transition': 'transitionend'
		},
		transEndEventName = transEndEventNames[ Modernizr.prefixed( 'transition' ) ],
		support = { transitions : Modernizr.csstransitions };

	/**
	 * gets the viewport width and height
	 * based on http://responsejs.com/labs/dimensions/
	 */
	function getViewport( axis ) {
		var client, inner;
		if( axis === 'x' ) {
			client = docElem['clientWidth'];
			inner = window['innerWidth'];
		}
		else if( axis === 'y' ) {
			client = docElem['clientHeight'];
			inner = window['innerHeight'];
		}
		
		return client < inner ? inner : client;
	}

	/**
	 * extend obj function
	 */
	function extend( a, b ) {
		for( var key in b ) { 
			if( b.hasOwnProperty( key ) ) {
				a[key] = b[key];
			}
		}
		return a;
	}

	/**
	 * DragSlideshow function
	 */
	function DragSlideshow( el, options ) {	
		this.el = el;
		this.options = extend( {}, this.options );
		extend( this.options, options );
		this._init();
	}

	/**
	 * DragSlideshow options
	 */
	DragSlideshow.prototype.options = {
		perspective : '1200',
		slideshowRatio : 0.3, // between: 0,1
		onToggle : function() { return false; },
		onToggleContent : function() { return false; },
		onToggleContentComplete : function() { return false; }
	}

	/**
	 * init function
	 * initialize and cache some vars
	 */
	DragSlideshow.prototype._init = function() {
		var self = this;

		// current
		this.current = 0;

		// status
		this.isFullscreen = true;
		
		// the images wrapper element
		this.imgDragger = this.el.querySelector( 'section.dragdealer' );
		
		// the moving element inside the images wrapper
		this.handle = this.imgDragger.querySelector( 'div.handle' );
		
		// the slides
		this.slides = [].slice.call( this.handle.children );
		
		// total number of slides
		this.slidesCount = this.slides.length;
		
		if( this.slidesCount < 1 ) return;

		// cache options slideshowRatio (needed for window resize)
		this.slideshowRatio = this.options.slideshowRatio;

		// add class "current" to first slide
		classie.add( this.slides[ this.current ], 'current' );
		
		// the pages/content
		this.pages = this.el.querySelector( 'section.pages' );

		// set the width of the handle : total slides * 100%
		this.handle.style.width = this.slidesCount * 100 + '%';
		
		// set the width of each slide to 100%/total slides
		this.slides.forEach( function( slide ) {
			slide.style.width = 100 / self.slidesCount + '%';
		} );
		
		// initialize the DragDealer plugin
		this._initDragDealer();

		// init events
		this._initEvents();
	}

	/**
	 * initialize the events
	 */
	DragSlideshow.prototype._initEvents = function() {
		var self = this;
		
		this.slides.forEach( function( slide ) {
			// clicking the slides when not in isFullscreen mode
			slide.addEventListener( 'click', function() {
				if( self.isFullscreen || self.dd.activity || self.isAnimating ) return false;
				
				if( self.slides.indexOf( slide ) === self.current ) {
					self.toggle();
				}
				else {
					self.dd.setStep( self.slides.indexOf( slide ) + 1 );
				}
			} );

			// reveal content
			slide.querySelector( 'button.content-switch' ).addEventListener( 'click', function() { self._toggleContent( slide ); } );
		} );

		// keyboard navigation events
		document.addEventListener( 'keydown', function( ev ) {
			var keyCode = ev.keyCode || ev.which,
				currentSlide = self.slides[ self.current ];

			if( self.isContent ) {
				switch (keyCode) {
					// up key
					case 38:
						// only if current scroll is 0:
						if( self._getContentPage( currentSlide ).scrollTop === 0 ) {
							self._toggleContent( currentSlide );
						}
						break;
				}
			}
			else {
				switch (keyCode) {
					// down key
					case 40:
						// if not fullscreen don't reveal the content. If you want to navigate directly to the content then remove this check.
						if( !self.isFullscreen ) return;
						self._toggleContent( currentSlide );
						break;
					// right and left keys
					case 37:
						self.dd.setStep( self.current );
						break;
					case 39:
						self.dd.setStep( self.current + 2 );
						break;
				}
			}
		} );
	}

	/**
	 * gets the content page of the current slide
	 */
	DragSlideshow.prototype._getContentPage = function( slide ) {
		return this.pages.querySelector( 'div.content[data-content = "' + slide.getAttribute( 'data-content' ) + '"]' );
	}

	/**
	 * show/hide content
	 */
	DragSlideshow.prototype._toggleContent = function( slide ) {
		if( this.isAnimating ) {
			return false;
		}
		this.isAnimating = true;

		// callback
		this.options.onToggleContent();

		// get page
		var page = this._getContentPage( slide );
		
		if( this.isContent ) {
			// enable the dragdealer
			this.dd.enable();
			classie.remove( this.el, 'show-content' );
		}
		else {
			// before: scroll all the content up
			page.scrollTop = 0;
			// disable the dragdealer
			this.dd.disable();
			classie.add( this.el, 'show-content' );	
			classie.add( page, 'show' );
		}

		var self = this,
			onEndTransitionFn = function( ev ) {
				if( support.transitions ) {
					if( ev.propertyName.indexOf( 'transform' ) === -1 || ev.target !== this ) return;
					this.removeEventListener( transEndEventName, onEndTransitionFn );
				}
				if( self.isContent ) {
					classie.remove( page, 'show' );	
				}
				self.isContent = !self.isContent;
				self.isAnimating = false;
				// callback
				self.options.onToggleContentComplete();
			};

		if( support.transitions ) {
			this.el.addEventListener( transEndEventName, onEndTransitionFn );
		}
		else {
			onEndTransitionFn();
		}
	}

	/**
	 * initialize the Dragdealer plugin
	 */
	DragSlideshow.prototype._initDragDealer = function() {
		var self = this;
		this.dd = new Dragdealer( this.imgDragger, {
			steps: this.slidesCount,
			speed: 0.4,
			loose: true,
			requestAnimationFrame : true,
			callback: function( x, y ) {
				self._navigate( x, y );
			}
		});
	}

	/**
	 * DragDealer plugin callback: update current value
	 */
	DragSlideshow.prototype._navigate = function( x, y ) {
		// add class "current" to the current slide / remove that same class from the old current slide
		classie.remove( this.slides[ this.current || 0 ], 'current' );
		this.current = this.dd.getStep()[0] - 1;
		classie.add( this.slides[ this.current ], 'current' );
	}

	/**
	 * toggle between fullscreen and minimized slideshow
	 */
	DragSlideshow.prototype.toggle = function() {
		if( this.isAnimating ) {
			return false;
		}
		this.isAnimating = true;

		// add preserve-3d to the slides (seems to fix a rendering problem in firefox)
		this._preserve3dSlides( true );
		
		// callback
		this.options.onToggle();

		classie.remove( this.el, this.isFullscreen ? 'switch-max' : 'switch-min' );
		classie.add( this.el, this.isFullscreen ? 'switch-min' : 'switch-max' );
		
		var self = this,
			p = this.options.perspective,
			r = this.options.slideshowRatio,
			zAxisVal = this.isFullscreen ? p - ( p / r ) : p - p * r;

		this.imgDragger.style.WebkitTransform = 'perspective(' + this.options.perspective + 'px) translate3d( -50%, -50%, ' + zAxisVal + 'px )';
		this.imgDragger.style.transform = 'perspective(' + this.options.perspective + 'px) translate3d( -50%, -50%, ' + zAxisVal + 'px )';

		var onEndTransitionFn = function( ev ) {
			if( support.transitions ) {
				if( ev.propertyName.indexOf( 'transform' ) === -1 ) return;
				this.removeEventListener( transEndEventName, onEndTransitionFn );
			}

			if( !self.isFullscreen ) {
				// remove preserve-3d to the slides (seems to fix a rendering problem in firefox)
				self._preserve3dSlides();
			}

			// replace class "img-dragger-large" with "img-dragger-small"
			classie.remove( this, self.isFullscreen ? 'img-dragger-large' : 'img-dragger-small' );
			classie.add( this, self.isFullscreen ? 'img-dragger-small' : 'img-dragger-large' );

			// reset transforms and set width & height
			self.imgDragger.style.WebkitTransform = 'translate3d( -50%, -50%, 0px )';
			self.imgDragger.style.transform = 'translate3d( -50%, -50%, 0px )';
			this.style.width = self.isFullscreen ? self.options.slideshowRatio * 100 + '%' : '100%';
			this.style.height = self.isFullscreen ? self.options.slideshowRatio * 100 + '%' : '100%';
			// reinstatiate the dragger with the "reflow" method
			self.dd.reflow();

			// change status
			self.isFullscreen = !self.isFullscreen;
			
			self.isAnimating = false;
		};

		if( support.transitions ) {
			this.imgDragger.addEventListener( transEndEventName, onEndTransitionFn );
		}
		else {
			onEndTransitionFn();
		}
	}

	/**
	 * add/remove preserve-3d to the slides (seems to fix a rendering problem in firefox)
	 */
	DragSlideshow.prototype._preserve3dSlides = function( add ) {
		this.slides.forEach( function( slide ) {
			slide.style.transformStyle = add ? 'preserve-3d' : '';
		});
	}

	/**
	 * add to global namespace
	 */
	window.DragSlideshow = DragSlideshow;

} )( window );