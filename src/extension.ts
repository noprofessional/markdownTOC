// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

function anylas(lineText:string):{depth:number,text:string,linktext:string}{
	let res:{depth:number,text:string,linktext:string} = {depth:-1,text:"",linktext:""};

	let index = lineText.search("^\s*#");
	if(index===-1){
		return res;
	}

	let stat = 0;
	let depth= 0;
	let titleStart = 0;
	for(let i=index;i!==lineText.length;++i){
		switch(lineText[i]){
			case '\t':
			case ' ':
				break;
			case '#':
			{
				if(stat===0){
					++depth;
				}
				break;
			}
			default:
			{
				if(stat===0){
					stat = 1;
					titleStart = i;
				}
				break;
			}
		}
		if(stat===1){
			break;
		}
	}

	let usableStr = lineText.substr(titleStart);
	let endi = 0;
	for(let i = usableStr.length-1;i!==0;--i){
		let flag = false;
		switch(usableStr[i]){
			case '\r':
			case '\n':
			case ' ':
			case '\t':
				break;
			default:
				flag = true;
				break;
		}
		if(flag){
			endi = i+1;
			break;
		}
	}
	usableStr = usableStr.substring(0,endi);

	res.depth = depth;
	res.text = usableStr;
	res.linktext = usableStr.replace(new RegExp('\\s+','g'),'-');

	return res;
}

var lineBreak ="";
var identifier = '<!-- TOC -->';
function initLineBreak(eolType: vscode.EndOfLine):void{
	switch(eolType)
	{
		case vscode.EndOfLine.LF:
			lineBreak="\n";
			break;
		case vscode.EndOfLine.CRLF:
			lineBreak="\r\n";
			break;
	}
}

class Node{
	public father:Node;
	public nodelist:Node[];
	public title:string;
	public linktext:string;
	public depth:number;
	constructor(father:Node|null,nodelist:Node[],title:string,linktext:string,depth:number){
			this.father = father?father:this;
			this.nodelist = nodelist;
			this.title = title;
			this.linktext = linktext;
			this.depth = depth;
	}

	public static traverse(root:Node):string{
		let res:string="";
		
		if(root.depth!==0)
		{
			for(let i =0 ; i < root.depth-1 ;++i){
				res+="  ";
			}
			res += "- [" + root.title +"](#" + root.linktext +")"+lineBreak;
		}

		for(let i = 0;i<root.nodelist.length;++i){
			res+=this.traverse(root.nodelist[i]);
		}

		return res;
	}
}




// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "markdowntoc" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerTextEditorCommand('extension.genToc', (editor,edit) => {
		// The code you place here will be executed every time your command is executed
		initLineBreak(editor.document.eol);

		let boundrayLines = [];
		
		let root:Node= new Node(null,[],"","",0);
		let treeNode:Node=root;
		let bError = false;
		for(let line=0;line !== editor.document.lineCount;++line)
		{
			let lineText = editor.document.lineAt(line).text;

			if(lineText.search(identifier)!==-1){
				boundrayLines.push(line);
			}

			let info = anylas(lineText);
			if(info.depth===-1){
				continue;
			}

			let depth = info.depth;
			let title = info.text;
			let linktext = info.linktext;
			let father = treeNode;

			if(depth === treeNode.depth + 1){
				father = treeNode;
			}
			else if(depth === treeNode.depth){
				father = treeNode.father;
			}
			else if(depth < treeNode.depth){
				while(treeNode.depth !== depth){
					treeNode = treeNode.father;
				}
				father = treeNode.father;
			}
			else{
				vscode.window.showInformationMessage("error occured when generating TOC");
				return;
			}

			let tempNode = new Node(father,[],title,linktext,depth);
			father.nodelist.push(tempNode);
			treeNode = tempNode;
		}

		let res = lineBreak + identifier + lineBreak + Node.traverse(root) + identifier + lineBreak;

		if(boundrayLines.length!==2 && boundrayLines.length!==0){
			vscode.window.showInformationMessage("error occured when generating TOC");
			return;
		}
		if(boundrayLines.length===2){
			edit.delete(new vscode.Range(new vscode.Position(boundrayLines[0],0),new vscode.Position(boundrayLines[1]+2,0)));
		}
		edit.insert(new vscode.Position(1,0),res);
	});

	let disposable2 = vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
		if (document.languageId === "markdown" && document.uri.scheme === "file") {
			vscode.commands.executeCommand("extension.genToc");
		}
	});

	context.subscriptions.push(disposable);
	context.subscriptions.push(disposable2);
	
}



// this method is called when your extension is deactivated
export function deactivate() {}
