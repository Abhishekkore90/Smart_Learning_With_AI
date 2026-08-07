const fs = require('fs');
const filePath = 'src/routes/teacher.mdm.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const targetBlock = `                                  <div
                                    key={partIdx}
                                    className={\`annual-page-container bg-white w-full \${partIdx > 0 ? 'html2pdf__page-break' : ''}\`}
                                    style={{
                                      boxSizing: "border-box",
                                      margin: 0,
                                      padding: 0
                                    }}
                                  >`;

const newBlock = `                                  <React.Fragment key={partIdx}>
                                    {partIdx > 0 && <div className="html2pdf__page-break" style={{ height: 0, border: "none", margin: 0, padding: 0 }}></div>}
                                    <div
                                      className="annual-page-container bg-white w-full"
                                      style={{
                                        boxSizing: "border-box",
                                        margin: 0,
                                        padding: 0
                                      }}
                                    >`;

if (content.includes(targetBlock)) {
  // We need to also close the React.Fragment at the end of the map.
  // The map return looks like:
  //                                    </div>
  //                                  </div>
  //                                ))}
  
  // Let's just replace the start block, and then find the closing div of this map.
  // Actually, wait, it's easier to use a regex or string manipulation to add the closing tag.
  content = content.replace(targetBlock, newBlock);
  
  // Now we need to find the end of the map to close React.Fragment instead of just the div.
  const endTarget = `                                      </div>
                                    </div>
                                  ))}`;
  const newEnd = `                                      </div>
                                    </div>
                                  </React.Fragment>
                                  ))}`;
                                  
  if (content.includes(endTarget)) {
      content = content.replace(endTarget, newEnd);
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Successfully updated page break logic and fragment');
  } else {
      console.error('End target not found');
  }

} else {
  console.error('Start block not found');
}
