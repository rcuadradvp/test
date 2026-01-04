// static/private/js/products/products-unassociated/state-manager.js

export class StateManager {
  constructor() {
    this.state = {
      data: [],
      filteredData: [],
      permissions: {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
      },
      currentView: 'loading',
      errorMessage: '',
      searchTerm: '',
    };
    
    this.listeners = new Set();
  }

  setState(updates) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };
    this.listeners.forEach(listener => listener(this.state, oldState));
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  setData(data) {
    this.setState({
      data,
      filteredData: this.filterData(data, this.state.searchTerm)
    });
  }

  setPermissions(permissions) {
    this.setState({ permissions });
  }

  setView(view) {
    this.setState({ currentView: view });
  }

  setError(errorMessage) {
    this.setState({ errorMessage, currentView: 'error' });
  }

  setSearchTerm(term) {
    const filtered = this.filterData(this.state.data, term);
    const currentView = filtered.length === 0 ? 'empty' : 'data';
    this.setState({
      searchTerm: term,
      filteredData: filtered,
      currentView: currentView
    });
  }

  filterData(data, term) {
    if (!term) return data;
    
    const lowerTerm = term.toLowerCase();
    return data.filter(item =>
      item.name?.toLowerCase().includes(lowerTerm) ||
      item.description?.toLowerCase().includes(lowerTerm)
    );
  }

  getState() {
    return { ...this.state };
  }

  getData() {
    return this.state.filteredData;
  }

  getPermissions() {
    return this.state.permissions;
  }

  getCurrentView() {
    return this.state.currentView;
  }
}