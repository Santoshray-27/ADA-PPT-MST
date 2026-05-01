#include <iostream>
#include <algorithm> // Required for the sort() function

using namespace std;

// 1. Structure to represent a single connection (edge)
struct Edge {
    int source;
    int destination;
    int weight;
};

// 2. Sorting rule: Tells the computer to put the smallest weight first
bool compare(Edge a, Edge b) {
    return a.weight < b.weight;
}

int main() {
    int parent[100]; // Array to keep track of the "leader" of each node
    
    // Total nodes and edges in our graph
    int vertices = 4; 
    int totalEdges = 5;

    // Array of all edges: {source, destination, weight}
    Edge edges[] = {
        {0, 1, 1}, 
        {0, 2, 3}, 
        {1, 2, 2}, 
        {1, 3, 4}, 
        {2, 3, 5}
    };

    // STEP 1: Initially, make every node its own leader
    for (int i = 0; i < vertices; i++) {
        parent[i] = i; 
    }

    // STEP 2: Sort the edges by weight (cheapest edge comes first)
    sort(edges, edges + totalEdges, compare);

    int totalCost = 0; // This will store our final answer
    cout << "Edges included in the MST:\n";

    // STEP 3: Loop through all the sorted edges one by one
    for (int i = 0; i < totalEdges; i++) {
        
        // --- Find the leader of the Source node ---
        int root1 = edges[i].source;
        while (parent[root1] != root1) { 
            root1 = parent[root1]; 
        }
        
        // --- Find the leader of the Destination node ---
        int root2 = edges[i].destination;
        while (parent[root2] != root2) {
            root2 = parent[root2];
        }

        // STEP 4: If leaders are different, there is no cycle. Add the edge!
        if (root1 != root2) {
            
            // Connect the two groups (make one leader the parent of the other)
            parent[root1] = root2; 
            
            // Add this edge's cost to our total bill
            totalCost = totalCost + edges[i].weight; 
            
            // Print the edge we just added
            cout << edges[i].source << " - " << edges[i].destination 
                 << " (Cost: " << edges[i].weight << ")\n";
        }
    }

    cout << "Total Minimum Cost: " << totalCost << "\n";

    return 0;
}








