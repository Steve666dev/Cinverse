const fs = require('fs');
let mdStr = fs.readFileSync('src/components/core/morphing-dialog.tsx', 'utf8');

// Change HTMLButtonElement to HTMLDivElement
mdStr = mdStr.replace(/React\.RefObject<HTMLButtonElement>/g, 'React.RefObject<HTMLDivElement>');

// Add onMouseMove, onMouseLeave to MorphingDialogTriggerProps
mdStr = mdStr.replace(
  /triggerRef\?: React\.RefObject<HTMLDivElement>;\n\};/g,
  `triggerRef?: React.RefObject<HTMLDivElement>;\n  onMouseMove?: React.MouseEventHandler<HTMLDivElement>;\n  onMouseLeave?: React.MouseEventHandler<HTMLDivElement>;\n};`
);

// Add onMouseMove, onMouseLeave to MorphingDialogTrigger arguments
mdStr = mdStr.replace(
  /triggerRef,\n\}: MorphingDialogTriggerProps\)/g,
  `triggerRef,\n  onMouseMove,\n  onMouseLeave,\n}: MorphingDialogTriggerProps)`
);

// Change motion.button to motion.div and apply props
mdStr = mdStr.replace(
  /<motion\.button/g,
  '<motion.div'
);
mdStr = mdStr.replace(
  /<\/motion\.button>/g,
  '</motion.div>'
);
mdStr = mdStr.replace(
  /onClick=\{handleClick\}\n      onKeyDown=\{handleKeyDown\}\n      style=\{style\}/g,
  `onClick={handleClick}\n      onKeyDown={handleKeyDown}\n      style={style}\n      onMouseMove={onMouseMove}\n      onMouseLeave={onMouseLeave}`
);

fs.writeFileSync('src/components/core/morphing-dialog.tsx', mdStr);
console.log('Updated MorphingDialogTrigger to div and forwarded mouse events');
