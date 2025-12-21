// static/private/js/clients/state-manager.js

export class StateManager {
  constructor() {
    this.state = {
      view: 'loading',
      data: [],
      filteredData: [],
      searchTerm: '',
      permissions: null,
      error: null,
    };
    this.listeners = [];
  }

  subscribe(callback) {
    this.listeners.push(callback);
  }

  notify(newState, oldState) {
    this.listeners.forEach(callback => callback(newState, oldState));
  }

  setState(updates) {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };
    this.notify(this.state, oldState);
  }

  setView(view) {
    this.setState({ view });
  }

  setData(data) {
    const filteredData = this.filterData(data, this.state.searchTerm);
    this.setState({ 
      data, 
      filteredData
    });
  }

  setSearchTerm(searchTerm) {
    this.setState({ 
      searchTerm, 
      filteredData: this.filterData(this.state.data, searchTerm) 
    });
  }

  setPermissions(permissions) {
    this.setState({ permissions });
  }

  setError(error) {
    this.setState({ view: 'error', error });
  }

  filterData(data, searchTerm) {
    if (!searchTerm) return data;
    const term = searchTerm.toLowerCase();
    return data.filter(item => 
      item.first_name?.toLowerCase().includes(term) ||
      item.last_name?.toLowerCase().includes(term) ||
      item.rut?.toLowerCase().includes(term) ||
      item.email?.toLowerCase().includes(term) ||
      item.phone?.toLowerCase().includes(term)
    );
  }

  getState() {
    return this.state;
  }
}