// static/private/js/products/product-detail/state-manager.js

export class StateManager {
  constructor() {
    this.state = {
      product: null,
      permissions: {
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExport: false,
      },
      currentView: 'loading',
      errorMessage: '',
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

  setProduct(product) {
    this.setState({ product });
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

  getState() {
    return { ...this.state };
  }

  getProduct() {
    return this.state.product;
  }

  getPermissions() {
    return this.state.permissions;
  }

  getCurrentView() {
    return this.state.currentView;
  }
}