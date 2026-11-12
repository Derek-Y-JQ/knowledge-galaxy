    // =====================================================================
    // 80-css — styles (host design tokens with light fallbacks)
    // =====================================================================

    const CSS_TEXT = `
.kg-panel,.kg-overlay,.kg-toast-wrap,.kg-collect-btn{--kg-bg:var(--dsw-alias-bg-base,#fff);--kg-layer:var(--dsw-alias-bg-layer-1,#f6f7f9);--kg-text:var(--dsw-alias-label-primary,#1f2328);--kg-text2:var(--dsw-alias-label-secondary,#5f6672);--kg-text3:var(--dsw-alias-label-tertiary,#98a0ab);--kg-line:var(--dsw-alias-border-l1,#e5e7eb);--kg-line2:var(--dsw-alias-border-l2,#d0d5dd);--kg-hover:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.05));--kg-primary:var(--dsw-alias-state-business-primary,#4f7cff);--kg-danger:#d1433a}
.kg-panel{box-sizing:border-box;flex:1 1 auto;display:flex;flex-direction:column;height:100%;min-height:0;background:var(--kg-bg);color:var(--kg-text);font-size:13px;line-height:1.5;position:relative;overflow:hidden}
.kg-panel *,.kg-overlay *{box-sizing:border-box}
.kg-toolbar{flex:none;display:flex;flex-direction:column;gap:8px;padding:12px 16px 10px;border-bottom:1px solid var(--kg-line);background:var(--kg-bg);z-index:5}
.kg-toolbar-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-width:0}
.kg-toolbar-sub{gap:10px}
.kg-title{display:flex;align-items:center;gap:6px;margin:0 6px 0 0;font-size:16px;font-weight:650;line-height:24px;white-space:nowrap}
.kg-grow{flex:1 1 auto;min-width:0}
.kg-muted{color:var(--kg-text3);font-size:12px}
.kg-pad{padding:10px}
.kg-btn{display:inline-flex;align-items:center;justify-content:center;gap:5px;height:30px;padding:0 12px;border-radius:8px;border:1px solid var(--kg-line);background:var(--kg-layer);color:var(--kg-text);font:inherit;font-size:12px;line-height:1;cursor:pointer;white-space:nowrap;transition:background-color .12s,border-color .12s}
.kg-btn:hover:not(:disabled){background:var(--kg-hover)}
.kg-btn:disabled{opacity:.5;cursor:default}
.kg-btn:focus-visible,.kg-icon-btn:focus-visible,.kg-seg-btn:focus-visible,.kg-modetab:focus-visible,.kg-chip:focus-visible,.kg-card:focus-visible,.kg-tl-item:focus-visible,.kg-option:focus-visible,.kg-target:focus-visible,.kg-galaxy:focus-visible,.kg-link-btn:focus-visible,.kg-toggle:focus-visible{outline:2px solid var(--kg-primary);outline-offset:1px}
.kg-btn-primary{background:var(--kg-primary);border-color:transparent;color:#fff}
.kg-btn-primary:hover:not(:disabled){background:var(--kg-primary);filter:brightness(1.08)}
.kg-btn-danger{color:#fff;background:var(--kg-danger);border-color:transparent}
.kg-btn-danger:hover:not(:disabled){background:var(--kg-danger);filter:brightness(1.08)}
.kg-btn-sm{height:26px;padding:0 9px;font-size:11.5px}
.kg-btn.is-active{border-color:var(--kg-primary);color:var(--kg-primary)}
.kg-icon-btn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;padding:0;border:none;border-radius:8px;background:transparent;color:var(--kg-text2);font:inherit;font-size:14px;cursor:pointer}
.kg-icon-btn:hover{background:var(--kg-hover);color:var(--kg-text)}
.kg-link-btn{border:none;background:transparent;color:var(--kg-primary);font:inherit;font-size:12px;cursor:pointer;padding:2px 4px;border-radius:4px;white-space:nowrap}
.kg-link-btn:hover{text-decoration:underline}
.kg-link-danger{color:var(--kg-danger)}
.kg-modetabs{display:flex;align-items:center;gap:2px}
.kg-modetab{display:inline-flex;align-items:center;gap:6px;height:30px;padding:0 12px;border:none;border-bottom:2px solid transparent;background:transparent;color:var(--kg-text2);font:inherit;font-size:13px;cursor:pointer;border-radius:8px 8px 0 0}
.kg-modetab:hover{color:var(--kg-text);background:var(--kg-hover)}
.kg-modetab.is-active{color:var(--kg-accent);border-bottom-color:var(--kg-accent);font-weight:600}
.kg-modetab-count{font-size:11px;font-weight:400;color:var(--kg-text3);font-variant-numeric:tabular-nums}
.kg-seg{display:inline-flex;align-self:flex-start;align-items:center;gap:2px;padding:2px;border-radius:10px;background:var(--kg-layer);flex:none}
.kg-seg-btn{height:26px;padding:0 11px;border-radius:8px;border:none;background:transparent;color:var(--kg-text2);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.kg-seg-btn:hover{color:var(--kg-text)}
.kg-seg-btn.is-active{background:var(--kg-bg);color:var(--kg-text);font-weight:600;box-shadow:0 1px 3px rgba(0,0,0,.14)}
.kg-seg-sm .kg-seg-btn{height:22px;padding:0 9px;font-size:11.5px}
.kg-search{display:flex;align-items:center;gap:6px;height:30px;min-width:180px;flex:1 1 220px;max-width:340px;padding:0 10px;border-radius:8px;border:1px solid var(--kg-line);background:var(--kg-bg);font-size:12px}
.kg-search input{flex:1;min-width:0;border:none;background:transparent;outline:none;color:var(--kg-text);font:inherit;font-size:12px}
.kg-search:focus-within{border-color:var(--kg-primary)}
.kg-select{height:30px;max-width:190px;padding:0 6px;border-radius:8px;border:1px solid var(--kg-line);background:var(--kg-bg);color:var(--kg-text);font:inherit;font-size:12px;outline:none;cursor:pointer}
.kg-select:focus{border-color:var(--kg-primary)}
.kg-select:disabled{opacity:.55;cursor:default}
.kg-select-sm{height:24px;max-width:150px;font-size:11px}
.kg-field .kg-select{width:100%;max-width:none}
.kg-content{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:auto}
.kg-content.is-star{overflow:hidden}
.kg-error-bar,.kg-info-bar{flex:none;display:flex;align-items:center;gap:8px;margin:8px 16px 0;padding:7px 12px;border-radius:8px;font-size:12px}
.kg-error-bar{background:rgba(209,67,58,.1);color:var(--kg-danger)}
.kg-info-bar{background:rgba(79,124,255,.1);color:var(--kg-text2)}
.kg-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:48px 20px;text-align:center}
.kg-empty-icon{font-size:34px;line-height:1}
.kg-empty-title{font-size:14px;font-weight:600}
.kg-empty-hint{max-width:420px;color:var(--kg-text2);font-size:12px;margin-bottom:6px}
.kg-spinner{width:22px;height:22px;border-radius:50%;border:2px solid var(--kg-line);border-top-color:var(--kg-primary);animation:kg-spin .8s linear infinite}
@keyframes kg-spin{to{transform:rotate(360deg)}}
.kg-mode-badge{display:inline-flex;align-items:center;height:17px;padding:0 6px;border-radius:5px;border:1px solid;font-size:10.5px;font-weight:600;line-height:1;white-space:nowrap;flex:none}
.kg-pill{display:inline-flex;align-items:center;height:17px;padding:0 6px;margin-left:6px;border-radius:999px;background:var(--kg-layer);color:var(--kg-text2);font-size:10.5px;font-weight:400;white-space:nowrap}
.kg-capsule{display:inline-flex;align-items:center;gap:5px;max-width:100%;height:22px;padding:0 9px;border-radius:999px;border:1px solid;font:inherit;font-size:11.5px;font-weight:550;white-space:nowrap;overflow:hidden}
.kg-capsule i{flex:none;width:6px;height:6px;border-radius:50%}
.kg-capsule span{overflow:hidden;text-overflow:ellipsis}
.kg-capsule.is-compact{height:18px;padding:0 7px;font-size:10.5px;flex:0 1 auto;min-width:0}
.kg-capsule.is-clickable{cursor:pointer}
.kg-capsule.is-clickable:hover{filter:brightness(.94)}
.kg-capsule-caret{font-size:9px;opacity:.8}
.kg-status{display:inline-flex;align-items:center;height:18px;padding:0 7px;border-radius:999px;border:1px solid var(--kg-line);background:transparent;color:var(--kg-text2);font:inherit;font-size:10.5px;cursor:pointer;white-space:nowrap;flex:none}
.kg-status:hover{border-color:var(--kg-line2);background:var(--kg-hover)}
.kg-status-doing{color:#b7791f;border-color:rgba(183,121,31,.4);background:rgba(250,204,21,.12)}
.kg-status-done{color:#1a7f5a;border-color:rgba(26,127,90,.4);background:rgba(52,211,153,.12)}
.kg-link-badge{flex:none;color:var(--kg-text2);font-size:11px;font-variant-numeric:tabular-nums;white-space:nowrap}
.kg-tags{display:flex;flex-wrap:wrap;gap:4px}
.kg-tag{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:5px;background:var(--kg-layer);color:var(--kg-text2);font-size:10.5px;white-space:nowrap;max-width:140px;overflow:hidden;text-overflow:ellipsis}
.kg-check{display:inline-flex;align-items:center;justify-content:center;flex:none;width:16px;height:16px;border-radius:50%;border:1.5px solid var(--kg-line2);font-size:10px;color:#fff;line-height:1}
.kg-check.is-on{background:var(--kg-primary);border-color:var(--kg-primary)}
/* grouped board */
.kg-board{flex:1 1 auto;min-height:0;display:flex;align-items:stretch;gap:12px;padding:14px 16px;overflow-x:auto}
.kg-col{flex:0 0 280px;width:280px;display:flex;flex-direction:column;min-height:0;border:1px solid var(--kg-line);border-radius:12px;background:var(--kg-layer)}
.kg-col-head{flex:none;display:flex;align-items:center;gap:8px;padding:10px 12px 8px}
.kg-col-glyph{display:inline-flex;align-items:center;justify-content:center;flex:none;width:24px;height:24px;border-radius:7px;font-size:13px;font-weight:600}
.kg-col-title{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kg-col-count{margin-left:auto;color:var(--kg-text3);font-size:11px;font-variant-numeric:tabular-nums}
.kg-col-body{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;gap:8px;padding:2px 8px 10px;overflow-y:auto}
.kg-col-empty{padding:18px 0;text-align:center;color:var(--kg-text3);font-size:12px}
.kg-card{position:relative;display:flex;flex-direction:column;gap:5px;padding:10px 10px 8px 12px;border:1px solid var(--kg-line);border-radius:10px;background:var(--kg-bg);cursor:pointer;transition:border-color .12s,box-shadow .12s;overflow:hidden;flex:none}
.kg-card::before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--kg-accent)}
.kg-card:hover{border-color:var(--kg-line2);box-shadow:0 2px 10px rgba(0,0,0,.07)}
.kg-card.is-selected{border-color:var(--kg-primary);box-shadow:0 0 0 1px var(--kg-primary)}
.kg-card-top{display:flex;align-items:center;gap:6px;font-size:11px;min-width:0}
.kg-card-sub{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kg-card-date{margin-left:auto;flex:none;color:var(--kg-text3);font-size:10.5px;font-variant-numeric:tabular-nums}
.kg-card-title{font-size:13px;font-weight:600;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;word-break:break-word}
.kg-card-meta{color:var(--kg-text2);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kg-card-summary{color:var(--kg-text2);font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kg-card-foot{display:flex;align-items:center;gap:6px;margin-top:1px;font-size:11px}
/* timeline */
.kg-timeline{width:100%;max-width:980px;margin:0 auto;padding:16px 20px 40px}
.kg-tl-node{position:relative;padding-left:22px;border-left:2px solid var(--kg-line);margin-left:7px;padding-bottom:10px}
.kg-tl-node:last-child{border-left-color:transparent}
.kg-tl-anchor{position:relative;display:flex;align-items:baseline;gap:8px;width:100%;margin:0 0 8px;padding:2px 4px;border:none;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer;border-radius:6px}
.kg-tl-anchor:hover{background:var(--kg-hover)}
.kg-tl-dot{position:absolute;left:-30px;top:6px;width:12px;height:12px;border-radius:50%;background:var(--kg-bg);border:3px solid var(--kg-primary)}
.kg-tl-date{font-size:14px;font-weight:650;font-variant-numeric:tabular-nums}
.kg-tl-count{color:var(--kg-text2);font-size:12px}
.kg-tl-caret{margin-left:auto;color:var(--kg-text3);font-size:11px}
.kg-tl-anchor.is-static{cursor:default}.kg-tl-anchor.is-static:hover{background:transparent}
.kg-tl-list{display:flex;flex-direction:column;padding-bottom:10px}
.kg-tl-item{position:relative;display:flex;align-items:baseline;gap:12px;padding:7px 8px 7px 4px;border-radius:8px;cursor:pointer}
.kg-tl-item:hover{background:var(--kg-hover)}
.kg-tl-item.is-selected{background:rgba(79,124,255,.1)}
.kg-tl-pt{position:absolute;left:-27px;top:13px;width:8px;height:8px;border-radius:50%;background:var(--kg-accent);box-shadow:0 0 0 3px var(--kg-bg)}
.kg-tl-time{flex:none;width:76px;color:var(--kg-text2);font-size:12px;font-variant-numeric:tabular-nums;white-space:nowrap}
.kg-tl-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:2px}
.kg-tl-head{display:flex;align-items:center;gap:8px;min-width:0}
.kg-tl-title{font-size:13.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:60px}
.kg-tl-sub{display:flex;align-items:baseline;gap:10px;min-width:0;color:var(--kg-text2);font-size:12px;white-space:nowrap;overflow:hidden}
.kg-tl-src{flex:none;color:var(--kg-text3)}
.kg-tl-summary{flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis}
.kg-tl-tag{flex:none;color:var(--kg-text3)}
.kg-cal{width:100%;max-width:980px;margin:0 auto;padding:14px 20px 40px;display:flex;flex-direction:column;gap:12px}
.kg-cal-head{display:flex;align-items:center;gap:8px}
.kg-cal-month{min-width:104px;text-align:center;font-size:15px;font-weight:650;font-variant-numeric:tabular-nums}
.kg-cal-grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));border-top:1px solid var(--kg-line);border-left:1px solid var(--kg-line);border-radius:10px;overflow:hidden}
.kg-cal-dow{padding:6px 8px;border-right:1px solid var(--kg-line);border-bottom:1px solid var(--kg-line);background:var(--kg-layer);color:var(--kg-text2);font-size:11.5px;text-align:center}
.kg-cal-cell{display:flex;flex-direction:column;gap:2px;min-height:78px;padding:4px 6px;border:none;border-right:1px solid var(--kg-line);border-bottom:1px solid var(--kg-line);background:var(--kg-bg);color:var(--kg-text);font:inherit;text-align:left;cursor:pointer;min-width:0}
.kg-cal-cell:hover{background:var(--kg-hover)}
.kg-cal-cell.is-out{color:var(--kg-text3)}.kg-cal-cell.is-out .kg-cal-entry{opacity:.55}
.kg-cal-cell.is-picked{box-shadow:inset 0 0 0 2px var(--kg-primary)}
.kg-cal-cell:focus-visible{outline:2px solid var(--kg-primary);outline-offset:-2px}
.kg-cal-top{display:flex;align-items:center;justify-content:space-between}
.kg-cal-num{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:22px;border-radius:50%;font-size:12px;font-variant-numeric:tabular-nums}
.kg-cal-cell.is-today .kg-cal-num{background:var(--kg-primary);color:#fff;font-weight:650}
.kg-cal-count{padding:0 6px;border-radius:9px;background:var(--kg-layer);color:var(--kg-text2);font-size:10.5px;font-variant-numeric:tabular-nums}
.kg-cal-entry{display:block;max-width:100%;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.kg-cal-entry i{display:inline-block;width:6px;height:6px;margin-right:5px;border-radius:50%;vertical-align:middle}
.kg-cal-more{color:var(--kg-text3);font-size:10.5px}
.kg-cal-day{margin-top:4px}
.kg-col.is-drop{border-color:var(--kg-primary);box-shadow:0 0 0 2px rgba(79,124,255,.25)}
.kg-card.is-dragging{opacity:.45}
.kg-card[draggable=true]{cursor:grab}
.kg-optionlist-scroll{max-height:180px;overflow-y:auto}
.kg-selectbar{position:absolute;left:50%;bottom:20px;transform:translateX(-50%);z-index:20;display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:12px;border:1px solid var(--kg-line);background:var(--kg-bg);box-shadow:0 8px 28px rgba(0,0,0,.18);white-space:nowrap}
/* modal */
.kg-overlay{position:fixed;inset:0;z-index:1000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(10,12,20,.46);color:var(--kg-text);font-size:13px;line-height:1.5}
.kg-modal{display:flex;flex-direction:column;width:min(560px,100%);max-height:min(88vh,900px);border-radius:14px;border:1px solid var(--kg-line);background:var(--kg-bg);box-shadow:0 24px 70px rgba(0,0,0,.3)}
.kg-modal-wide{width:min(820px,100%)}
.kg-modal-head{flex:none;display:flex;align-items:center;gap:10px;padding:12px 14px 10px 18px;border-bottom:1px solid var(--kg-line)}
.kg-modal-title{flex:1;margin:0;font-size:15px;font-weight:650}
.kg-modal-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:14px 18px;display:flex;flex-direction:column;gap:12px}
.kg-modal-foot{flex:none;display:flex;align-items:center;gap:8px;padding:10px 18px 12px;border-top:1px solid var(--kg-line);flex-wrap:wrap}
.kg-toast-wrap{position:fixed;left:50%;bottom:32px;transform:translateX(-50%);z-index:1200;display:flex;flex-direction:column;align-items:center;gap:8px;pointer-events:none}
.kg-toast{max-width:min(520px,90vw);padding:8px 14px;border-radius:10px;background:#1f2430;color:#fff;font-size:12.5px;box-shadow:0 8px 24px rgba(0,0,0,.25)}
.kg-toast-error{background:#b4372f}
/* forms */
.kg-form{display:flex;flex-direction:column;gap:10px}
.kg-form-row{display:flex;gap:10px;align-items:flex-start}
.kg-form-row>*{flex:1 1 0;min-width:0}
.kg-field{display:flex;flex-direction:column;gap:4px;min-width:0}
.kg-field-narrow{flex:0 0 130px}
.kg-field-label{color:var(--kg-text2);font-size:11.5px;font-weight:550}
.kg-field-label em{color:var(--kg-danger);font-style:normal}
.kg-field-hint,.kg-hint-line{color:var(--kg-text3);font-size:11.5px}
.kg-hint-line{padding:6px 10px;border-radius:8px;background:var(--kg-layer);color:var(--kg-text2)}
.kg-input{width:100%;height:32px;padding:0 10px;border-radius:8px;border:1px solid var(--kg-line);background:var(--kg-bg);color:var(--kg-text);font:inherit;font-size:12.5px;outline:none}
.kg-input:focus{border-color:var(--kg-primary)}
.kg-textarea{height:auto;padding:8px 10px;line-height:1.55;resize:vertical;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px}
.kg-fieldset{display:flex;flex-direction:column;gap:10px;margin:0;padding:10px 12px 12px;border:1px solid var(--kg-line);border-radius:10px;min-width:0}
.kg-fieldset legend{padding:0 6px;font-size:12px;font-weight:600}
.kg-inline-check{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;cursor:pointer}
.kg-inline-form{display:flex;flex-direction:column;gap:10px;margin:6px 0;padding:12px;border-radius:10px;border:1px dashed var(--kg-line2);background:var(--kg-layer)}
.kg-danger-box{border-color:rgba(209,67,58,.5);background:rgba(209,67,58,.06)}
.kg-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.kg-editor-bar{display:flex;align-items:center;gap:8px}
.kg-preview{padding:10px 12px;border:1px solid var(--kg-line);border-radius:8px;min-height:80px}
.kg-chips{display:flex;flex-wrap:wrap;gap:6px}
.kg-chip{height:24px;padding:0 10px;border-radius:999px;border:1px solid var(--kg-line);background:transparent;color:var(--kg-text2);font:inherit;font-size:11.5px;cursor:pointer;white-space:nowrap}
.kg-chip:hover{background:var(--kg-hover)}
.kg-chip.is-active{background:var(--kg-primary);border-color:transparent;color:#fff}
.kg-toggle{position:relative;flex:none;width:36px;height:20px;padding:0;border:none;border-radius:999px;background:var(--kg-line2);cursor:pointer;transition:background-color .15s}
.kg-toggle.is-on{background:var(--kg-primary)}
.kg-toggle:disabled{opacity:.5;cursor:default}
.kg-toggle-knob{position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform .15s}
.kg-toggle.is-on .kg-toggle-knob{transform:translateX(16px)}
.kg-colors{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.kg-swatch{width:22px;height:22px;padding:0;border-radius:50%;border:2px solid transparent;cursor:pointer}
.kg-swatch.is-active{border-color:var(--kg-text);box-shadow:0 0 0 2px var(--kg-bg) inset}
.kg-hex{width:96px;height:26px;font-family:ui-monospace,Menlo,monospace}
/* markdown */
.kg-md{font-size:13px;line-height:1.65;word-break:break-word;min-width:0}
.kg-md-scroll{overflow:hidden;position:relative}
.kg-md-scroll.is-collapsed::after{content:"";position:absolute;left:0;right:0;bottom:0;height:44px;background:linear-gradient(to bottom,transparent,var(--kg-bg));pointer-events:none}
.kg-md-toggle{margin-top:4px}
.kg-md a[href*="#kg-card-"]{display:inline-block;padding:0 6px;border-radius:6px;background:rgba(79,124,255,.12);color:var(--kg-primary);text-decoration:none;font-size:.95em}
.kg-md-fallback p{margin:0 0 8px}.kg-md-fallback pre{padding:10px;border-radius:8px;background:var(--kg-layer);overflow:auto}.kg-md-fallback h1,.kg-md-fallback h2,.kg-md-fallback h3,.kg-md-fallback h4{margin:10px 0 6px;font-size:14px}.kg-md-fallback ul,.kg-md-fallback ol{margin:0 0 8px;padding-left:20px}.kg-md-fallback blockquote{margin:0 0 8px;padding-left:10px;border-left:3px solid var(--kg-line2);color:var(--kg-text2)}
/* detail */
.kg-breadcrumb{align-self:flex-start;display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border:none;border-radius:8px;background:var(--kg-layer);color:var(--kg-primary);font:inherit;font-size:12px;cursor:pointer;max-width:100%}
.kg-breadcrumb span{color:var(--kg-text2);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kg-breadcrumb:hover{background:var(--kg-hover)}
.kg-detail{display:flex;flex-direction:column;gap:10px;min-width:0}
.kg-detail-locate{position:relative;display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.kg-detail-title{margin:0;font-size:19px;font-weight:650;line-height:1.35;word-break:break-word}
.kg-detail-meta{display:flex;flex-wrap:wrap;gap:4px 14px;color:var(--kg-text3);font-size:11.5px}
.kg-detail-summary{margin:0;padding:8px 12px;border-left:3px solid var(--kg-line2);background:var(--kg-layer);border-radius:0 8px 8px 0;color:var(--kg-text2)}
.kg-popover{position:absolute;left:0;top:28px;z-index:30;display:flex;flex-direction:column;gap:10px;width:min(480px,calc(100vw - 80px));padding:12px;border-radius:12px;border:1px solid var(--kg-line);background:var(--kg-bg);box-shadow:0 12px 36px rgba(0,0,0,.22)}
.kg-paper{padding:10px 12px;border:1px solid var(--kg-line);border-radius:10px;background:var(--kg-layer)}
.kg-paper dl{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0;font-size:12.5px}
.kg-paper dt{color:var(--kg-text3);white-space:nowrap}
.kg-paper dd{margin:0;min-width:0;word-break:break-word}
.kg-paper a{color:var(--kg-primary)}
.kg-paper-abstract{margin-top:8px}
.kg-section{display:flex;flex-direction:column;gap:8px;padding-top:10px;border-top:1px solid var(--kg-line);min-width:0}
.kg-section-head{display:flex;align-items:center;gap:8px}
.kg-section-head h3{flex:1;display:flex;align-items:center;gap:6px;margin:0;font-size:13.5px;font-weight:650}
.kg-count{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:var(--kg-layer);color:var(--kg-text2);font-size:11px;font-weight:500}
.kg-origin{padding:8px 12px;border:1px solid var(--kg-line);border-radius:10px}
.kg-origin summary{cursor:pointer;color:var(--kg-text2);font-size:12px}
.kg-origin-q{margin:8px 0}
.kg-linklist{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:6px}
.kg-linkrow{display:flex;align-items:flex-start;gap:10px;padding:8px 10px;border:1px solid var(--kg-line);border-radius:10px}
.kg-linklabel{flex:none;display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:6px;background:rgba(79,124,255,.12);color:var(--kg-primary);font-size:11.5px;font-weight:600;white-space:nowrap;max-width:180px;overflow:hidden;text-overflow:ellipsis}
.kg-linklabel.is-ref{background:rgba(139,92,246,.13);color:#7c4ddb}
.kg-linktargets{flex:1 1 auto;min-width:0;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.kg-linknote{flex-basis:100%;color:var(--kg-text2);font-size:12px}
.kg-linkauto{padding-top:3px}
.kg-target{display:inline-flex;align-items:center;gap:6px;max-width:100%;height:24px;padding:0 9px;border-radius:999px;border:1px solid;background:transparent;color:var(--kg-text);font:inherit;font-size:12px;cursor:pointer}
.kg-target:hover{filter:brightness(.95);text-decoration:underline}
.kg-target i{flex:none;width:6px;height:6px;border-radius:50%}
.kg-target-title{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:300px}
.kg-target-mode{flex:none;font-size:10.5px;font-weight:600}
.kg-linkpanel{display:flex;flex-direction:column;gap:10px;padding:12px;border-radius:12px;border:1px solid var(--kg-primary);background:var(--kg-layer);animation:kg-slide .18s ease-out}
@keyframes kg-slide{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.kg-linkpanel-search{display:flex;gap:8px;flex-wrap:wrap}
.kg-linkpanel-list{display:flex;flex-direction:column;gap:4px;max-height:220px;overflow-y:auto}
.kg-linkpanel-form{display:flex;flex-direction:column;gap:8px}
.kg-list-caption{color:var(--kg-text2);font-size:11.5px;font-weight:600;padding:2px 4px}
.kg-optionlist{display:flex;flex-direction:column;gap:4px}
.kg-option{display:flex;align-items:center;gap:8px;width:100%;min-height:32px;padding:5px 10px;border-radius:8px;border:1px solid var(--kg-line);background:var(--kg-bg);color:var(--kg-text);font:inherit;font-size:12.5px;text-align:left;cursor:pointer}
.kg-option:hover{border-color:var(--kg-line2);background:var(--kg-hover)}
.kg-option.is-checked{border-color:var(--kg-primary)}
.kg-option-title{flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kg-option-hint{flex:none;color:var(--kg-text3);font-size:11px}
.kg-refpicker{display:flex;flex-direction:column;gap:4px;padding:8px;border-radius:10px;border:1px solid var(--kg-line);background:var(--kg-layer)}
/* manage + settings */
.kg-catlist,.kg-sublist,.kg-tasks,.kg-linkpage{list-style:none;margin:0;padding:0}
.kg-catlist{display:flex;flex-direction:column;gap:8px}
.kg-catblock{border:1px solid var(--kg-line);border-radius:12px;padding:6px 10px}
.kg-catblock.is-hidden>.kg-catrow .kg-catrow-name,.kg-subrow.is-hidden .kg-subrow-name{opacity:.5;text-decoration:line-through}
.kg-catrow{display:flex;align-items:center;gap:8px;flex-wrap:wrap;min-height:34px}
.kg-catrow-name{font-weight:650;font-size:13.5px}
.kg-sublist{margin:2px 0 4px 34px;border-top:1px solid var(--kg-line)}
.kg-subrow{border-bottom:1px solid var(--kg-line)}
.kg-subrow:last-child{border-bottom:none}
.kg-subrow-main{display:flex;align-items:center;gap:8px;min-height:34px;flex-wrap:wrap}
.kg-subrow-name{font-weight:550}
.kg-subrow-kw{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px}
.kg-fav{border:none;background:transparent;color:var(--kg-text3);font-size:14px;cursor:pointer;padding:0 2px}
.kg-fav.is-on{color:#f5b301}
.kg-manage-foot{display:flex;gap:8px}
.kg-presets{display:flex;flex-direction:column;gap:8px}
.kg-preset{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:1px solid var(--kg-line);border-radius:10px;cursor:pointer}
.kg-preset.is-picked{border-color:var(--kg-primary);background:rgba(79,124,255,.06)}
.kg-preset-name{font-weight:650}
.kg-preset-subs{margin-top:2px;color:var(--kg-text2);font-size:11.5px}
.kg-setting-group{margin:6px 0 0;font-size:12px;font-weight:650;color:var(--kg-text2)}
.kg-setting{display:flex;align-items:center;gap:14px;padding:8px 0;border-bottom:1px solid var(--kg-line)}
.kg-setting-text{flex:1 1 auto;min-width:0}
.kg-setting-title{font-weight:600}
.kg-setting-text a,.kg-update a:not(.kg-btn){color:var(--kg-primary)}
.kg-update{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:8px 12px;border-radius:8px;background:var(--kg-layer);font-size:12.5px}
.kg-update-new{background:rgba(52,211,153,.14)}
.kg-update-error{background:rgba(209,67,58,.1);color:var(--kg-danger)}
a.kg-btn{text-decoration:none}
/* pages */
.kg-page{display:flex;flex-direction:column;gap:12px;width:100%;max-width:980px;margin:0 auto;padding:14px 20px 40px}
.kg-linkpage{display:flex;flex-direction:column;gap:10px}
.kg-linkcard{display:flex;flex-direction:column;gap:8px;padding:10px 12px;border:1px solid var(--kg-line);border-radius:12px}
.kg-linkcard-head{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.kg-schedule-form{padding:14px;border:1px solid var(--kg-line);border-radius:12px;background:var(--kg-layer)}
.kg-tasks{display:flex;flex-direction:column;gap:8px}
.kg-task{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--kg-line);border-radius:12px}
.kg-task-main{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:4px}
.kg-task-title{display:flex;align-items:center;gap:8px;font-weight:650;flex-wrap:wrap}
.kg-task-meta{display:flex;flex-wrap:wrap;gap:2px 14px;color:var(--kg-text2);font-size:12px}
/* star map (always dark) */
.kg-star{flex:1 1 auto;min-height:0;display:flex;background:#05060f;color:#e6ebff}
.kg-star-side{flex:none;width:214px;display:flex;flex-direction:column;border-right:1px solid rgba(160,175,230,.14);background:rgba(10,13,30,.92);transition:width .18s}
.kg-star-side.is-narrow{width:54px}
.kg-star-side-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:10px 10px 6px 14px;color:rgba(200,210,245,.6);font-size:11.5px;letter-spacing:.08em}
.kg-star-side.is-narrow .kg-star-side-head{justify-content:center;padding-left:10px}
.kg-star-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:none;border-radius:6px;background:transparent;color:rgba(214,222,250,.75);font:inherit;font-size:12px;cursor:pointer}
.kg-star-iconbtn:hover{background:rgba(160,175,230,.16);color:#fff}
.kg-star-side-list{flex:1 1 auto;min-height:0;overflow-y:auto;padding:0 8px 12px;display:flex;flex-direction:column;gap:2px}
.kg-star-group{padding:10px 6px 4px;font-size:11px;font-weight:650}
.kg-galaxy{display:flex;align-items:center;gap:10px;width:100%;padding:7px 8px;border:1px solid transparent;border-radius:10px;background:transparent;color:inherit;font:inherit;text-align:left;cursor:pointer}
.kg-galaxy:hover{background:rgba(160,175,230,.1)}
.kg-galaxy.is-active{background:rgba(160,175,230,.14);border-color:var(--kg-accent)}
.kg-galaxy-glyph{flex:none;display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;border:1px solid var(--kg-accent);color:var(--kg-accent);font-size:14px;font-weight:600;background:rgba(5,6,15,.6)}
.kg-galaxy-text{min-width:0;display:flex;flex-direction:column}
.kg-galaxy-name{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kg-galaxy-dot{flex:none;width:7px;height:7px;border-radius:50%;background:var(--kg-accent);box-shadow:0 0 8px var(--kg-accent)}
.kg-galaxy-meta{color:rgba(200,210,245,.55);font-size:10.5px;font-variant-numeric:tabular-nums}
.kg-star-stage{position:relative;flex:1 1 auto;min-width:0;overflow:hidden}
.kg-star-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;cursor:grab}
.kg-hud,.kg-planet-panel,.kg-star-tip{border:1px solid rgba(170,186,240,.22);background:rgba(14,18,40,.62);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-radius:12px;color:#e6ebff}
.kg-hud{position:absolute;top:12px;right:12px;width:212px;display:flex;flex-direction:column;gap:7px;padding:10px 12px;font-size:11.5px}
.kg-hud-title{display:flex;align-items:center;gap:6px;font-size:13.5px;font-weight:650}
.kg-hud-glyph{font-size:15px}
.kg-hud-stats{display:flex;flex-wrap:wrap;gap:2px 10px;color:rgba(214,222,250,.75)}
.kg-hud-stats b{color:#fff;font-variant-numeric:tabular-nums}
.kg-hud-status{display:flex;flex-wrap:wrap;gap:2px 10px;color:rgba(200,210,245,.6);font-size:11px}
.kg-hud-row{display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer}
.kg-hud .kg-select{height:24px;font-size:11px;background:rgba(5,6,15,.5);color:#e6ebff;border-color:rgba(170,186,240,.25)}
.kg-hud .kg-toggle{background:rgba(170,186,240,.28)}
.kg-hud .kg-toggle.is-on{background:#5b8cff}
.kg-hud-tip{color:rgba(200,210,245,.45);font-size:10.5px}
.kg-planet-panel{position:absolute;left:12px;bottom:12px;width:260px;max-height:46%;display:flex;flex-direction:column;overflow:hidden}
.kg-planet-head{flex:none;display:flex;align-items:center;gap:8px;padding:8px 8px 6px 12px;font-weight:650;font-size:12.5px}
.kg-planet-count{flex:1;color:rgba(200,210,245,.6);font-weight:400;font-size:11px}
.kg-planet-list{overflow-y:auto;padding:0 6px 8px;display:flex;flex-direction:column;gap:2px}
.kg-planet-item{display:flex;align-items:center;gap:8px;width:100%;padding:5px 8px;border:none;border-radius:7px;background:transparent;color:inherit;font:inherit;font-size:12px;text-align:left;cursor:pointer}
.kg-planet-item:hover{background:rgba(160,175,230,.16)}
.kg-planet-item span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.kg-planet-item em{flex:none;font-style:normal;color:rgba(200,210,245,.55);font-size:10.5px}
.kg-planet-empty{padding:4px 12px 12px;color:rgba(200,210,245,.6);font-size:11.5px}
.kg-star-tip{position:absolute;z-index:4;width:240px;padding:9px 11px;transform:translate(14px,14px);pointer-events:none;font-size:11.5px}
.kg-star-tip-title{font-size:12.5px;font-weight:650;line-height:1.4;word-break:break-word}
.kg-star-tip-meta{margin-top:2px;color:rgba(200,210,245,.7)}
.kg-star-tip-body{margin-top:5px;color:rgba(226,232,255,.85);display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.kg-star-tip-foot{margin-top:5px;color:rgba(200,210,245,.45);font-size:10.5px}
.kg-star .kg-mode-badge{background:rgba(255,255,255,.08)!important}
/* chat action */
.kg-collect-btn{display:inline-flex;align-items:center;gap:5px;height:26px;padding:0 9px;border:1px solid transparent;border-radius:8px;background:transparent;color:var(--kg-text2);font:inherit;font-size:12px;cursor:pointer;white-space:nowrap}
.kg-collect-btn:hover{background:var(--kg-hover);color:var(--kg-text)}
.kg-collect-btn.is-collected{color:var(--kg-primary)}
@media (max-width:760px){.kg-form-row{flex-direction:column}.kg-form-row>*{flex:none;width:100%}.kg-tl-time{width:60px}.kg-cal-cell{min-height:64px}.kg-cal-entry{display:none}.kg-hud{width:180px}.kg-star-side{width:54px}.kg-star-side .kg-galaxy-text,.kg-star-side .kg-star-side-head span{display:none}}
@media (prefers-reduced-motion:reduce){.kg-linkpanel,.kg-spinner{animation:none}}
`

    function installCSS() {
      try {
        if (typeof document === 'undefined') return
        if (document.querySelector('style[data-plugin="knowledge-galaxy"]')) return
        const style = document.createElement('style')
        style.setAttribute('data-plugin', 'knowledge-galaxy')
        style.textContent = CSS_TEXT
        document.head.appendChild(style)
      } catch (error) {
        console.warn('[knowledge-galaxy] css injection failed', error)
      }
    }
