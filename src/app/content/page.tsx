"use client";

import { Suspense } from "react";
import { useContentHub } from "@/hooks/useContentHub";
import ContentHeader from "@/components/content/ContentHeader";
import ContentFilters from "@/components/content/ContentFilters";
import BulkActions from "@/components/content/BulkActions";
import KanbanBoard from "@/components/content/KanbanBoard";
import CalendarView from "@/components/content/CalendarView";
import TableView from "@/components/content/TableView";
import CampaignKanban from "@/components/content/CampaignKanban";
import CampaignCalendar from "@/components/content/CampaignCalendar";

export default function ContentHubPage() {
  return (
    <Suspense fallback={<div className="flex-1 p-6 space-y-3">{[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-gray-900 rounded-xl animate-pulse" />)}</div>}>
      <ContentHubInner />
    </Suspense>
  );
}

function ContentHubInner() {
  const hub = useContentHub();

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <ContentHeader
        brands={hub.brands}
        activeBrand={hub.activeBrand}
        onBrandChange={hub.setActiveBrand}
        view={hub.view}
        onViewChange={hub.setView}
        displayMode={hub.displayMode}
        onDisplayModeChange={hub.setDisplayMode}
      />

      {hub.displayMode === "posts" && (
        <>
          <ContentFilters
            searchQuery={hub.searchQuery}
            onSearchChange={hub.setSearchQuery}
            filterStatus={hub.filterStatus}
            onFilterStatusChange={hub.setFilterStatus}
            filterContentType={hub.filterContentType}
            onFilterContentTypeChange={hub.setFilterContentType}
            filterServiceArea={hub.filterServiceArea}
            onFilterServiceAreaChange={hub.setFilterServiceArea}
            filterTags={hub.filterTags}
            onFilterTagsChange={hub.setFilterTags}
            tags={hub.tags}
            sortBy={hub.sortBy}
            sortOrder={hub.sortOrder}
            onSortChange={(by, order) => { hub.setSortBy(by); hub.setSortOrder(order); }}
            showAdvanced={hub.showFilters}
            onToggleAdvanced={() => hub.setShowFilters(!hub.showFilters)}
            activeFilterCount={hub.activeFilterCount}
            postCount={hub.displayPosts.length}
          />

          <BulkActions
            count={hub.selected.size}
            tags={hub.tags}
            onBulkAction={hub.handleBulkAction}
            onDeselect={() => hub.setSelected(new Set())}
          />
        </>
      )}

      {/* Messages */}
      {hub.error && <div className="mx-4 mt-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-1.5 text-red-400 text-xs flex items-center justify-between">{hub.error}<button onClick={() => hub.setError(null)} className="text-red-500 ml-2">x</button></div>}
      {hub.actionMsg && <div className="mx-4 mt-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-1.5 text-green-400 text-xs flex items-center justify-between">{hub.actionMsg}<button onClick={() => hub.setActionMsg(null)} className="text-green-500 ml-2">x</button></div>}

      {/* Loading */}
      {(hub.postsLoading || hub.loading) ? (
        <div className="flex-1 p-6 space-y-3">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-gray-900 rounded-xl animate-pulse" />)}
        </div>
      ) : hub.displayMode === "campaigns" ? (
        // Campaign views
        hub.view === "calendar" ? (
          <CampaignCalendar
            campaigns={hub.displayCampaigns}
            campaignsByDate={hub.campaignsByDate}
            unscheduledCampaigns={hub.unscheduledCampaigns}
            brands={hub.brands}
            calYear={hub.calYear}
            calMonth={hub.calMonth}
            onYearChange={hub.setCalYear}
            onMonthChange={hub.setCalMonth}
            onAction={hub.handleCampaignAction}
          />
        ) : (
          <CampaignKanban
            campaignsByStatus={hub.campaignsByStatus}
            brands={hub.brands}
            showBrand={hub.activeBrand === "all"}
            onAction={hub.handleCampaignAction}
          />
        )
      ) : (
        // Post views
        hub.view === "kanban" ? (
          <KanbanBoard
            postsByStatus={hub.postsByStatus}
            thumbnails={hub.thumbnails}
            brands={hub.brands}
            showBrand={hub.activeBrand === "all"}
            onAction={hub.handleAction}
          />
        ) : hub.view === "calendar" ? (
          <CalendarView
            posts={hub.displayPosts}
            postsByDate={hub.postsByDate}
            unscheduledPosts={hub.unscheduledPosts}
            thumbnails={hub.thumbnails}
            brands={hub.brands}
            calYear={hub.calYear}
            calMonth={hub.calMonth}
            onYearChange={hub.setCalYear}
            onMonthChange={hub.setCalMonth}
            onAction={hub.handleAction}
          />
        ) : (
          <TableView
            posts={hub.displayPosts}
            thumbnails={hub.thumbnails}
            brands={hub.brands}
            showBrand={hub.activeBrand === "all"}
            selected={hub.selected}
            onToggleSelect={hub.toggleSelect}
            onToggleSelectAll={hub.toggleSelectAll}
            onAction={hub.handleAction}
          />
        )
      )}
    </div>
  );
}
