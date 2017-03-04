"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var DiagramIOHTMLModule = (function () {
    function DiagramIOHTMLModule(targetDiagram) {
        this._targetDiagram = targetDiagram;
        this.upstreamChange = function () {
            console.log("This element has subscribed to upstream changes, but not implemented a handler.");
        };
    }
    Object.defineProperty(DiagramIOHTMLModule.prototype, "targetDiagram", {
        get: function () {
            return this._targetDiagram;
        },
        enumerable: true,
        configurable: true
    });
    return DiagramIOHTMLModule;
}());
exports.DiagramIOHTMLModule = DiagramIOHTMLModule;
