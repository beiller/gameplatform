import json
from collections import namedtuple

file = open('mr/mesh.json')
json_content = json.load(file)
print("ok!")


Node = namedtuple('Node', ['name', 'bone', 'children', 'parent'])

l = json_content['bones']
nodes = {}
for i in range(len(l)):
    nodes[i] = Node(l[i]['name'], l[i], [], None)

for i in range(len(l)):
    bone = l[i]
    if bone['parent'] > -1:
        nodes[i] = Node(nodes[i].name, nodes[i].bone, nodes[i].children, nodes[bone['parent']])
        nodes[bone['parent']].children.append(nodes[i])


def print_children(node, depth):
    for child in node.children:
        print("-" * depth, child.name)
        print_children(child, depth+1)

print(nodes[0].name)
print_children(nodes[0], 1)
