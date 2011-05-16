# ∞

A simple side-scroller game engine with a huge, randomly generated world.

## Setting up source code

### Prerequisites

*   A UNIX shell

    > This project uses shell scripts to make work easier. They should work
    > fine on a Mac and in Linux environments. It's still possible to work on
    > this project on a Windows machine, of course, but you need to do some
    > extra manual work.

### Getting it up and running

1.  Clone the repository:           
        
        $ git clone http://github.com/blixt/inf.git

2.  Run the compile script:
        
        $ cd inf
        $ ./compile

    This will get the latest Closure Library, calculate dependencies and set up
    the `out/` directory. In this directory you will find `demo.html` and
    `demo.js`, a compiled demo project that you can open in your browser.

### Debugging

There is a `demo.debug.html` file for running the aforementioned demo project
in debug mode. This means that it will run the source code uncompiled and with
additional debugging messages (printed in the browser console). Running the
demo in debug mode will not work until the `compile` script has been run.

## Browser support

This project does not in any way try to be compatible with all browsers out
there. It has been written with modern browser technologies in mind, and focus
should be put on them, not backwards compatibility.

The browsers/platforms known to work properly are:

* Firefox 4
* Google Chrome 8
* Opera 10.6
* Android 2.2
* iOS 3.2

## Code style

The code should adhere to guidelines that have been agreed upon by the
developer community. This means that the code should validate when run through
[JSLint][jslint], and the [Google Closure Compiler][gcc] should not generate
any warnings or errors.

General code style should follow the [Google JavaScript Style Guide][gjssg].

[jslint]: http://jslint.com/
[gcc]: http://code.google.com/closure/compiler/
[gjssg]: http://google-styleguide.googlecode.com/svn/trunk/javascriptguide.xml

### JSLint exceptions

Running JSLint without any additional options *will* generate errors for the
code of this project. The rationale for suppressing those errors will be
explained here.

*   Implied globals.

    > This code is written to run in a browser, which means it expects some
    > global variables to be available. JSLint option declarations have been
    > added for them. Additionally, the `console.log` function is expected to
    > exist in code built with `inf.DEBUG = true`.

*   The body of a `for in` should be wrapped in an `if` statement to filter
    unwanted properties from the prototype.

    > This rule should be followed, even if the warning has been disabled. The
    > warning has been disabled so that the `if` statement can be skipped in
    > certain cases.
    >
    > The only current case is when looping through a plain object (`{}`). The
    > `if` statement is avoided since this `for` loop is run very often.
    >
    > As the code for this project has not been written with interoperability
    > with other libraries in mind, we can assume that `Object.prototype` has
    > not been compromised.

## MIT license

This project is licensed under an MIT license.  
<http://www.opensource.org/licenses/mit-license.php>

Copyright © 2011 Andreas Blixt <andreas@blixt.org>
